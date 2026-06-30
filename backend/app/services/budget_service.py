"""Servicio de presupuestos: cálculo automático, versionado."""
import os
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException

from app.models.budget import Budget, LaborCost
from app.models.project import Project
from app.repositories.catalog_repository import CatalogRepository


class BudgetService:

    IVA_RATE = float(os.getenv("IVA_RATE", "0.16"))

    @staticmethod
    def _round2(value: float) -> float:
        return round(value, 2)

    @staticmethod
    def _get_catalog_price(db: Session, model_cls, catalog_id: str, catalog_name: str) -> float:
        """Obtiene el precio de un catálogo por ID, o 0 si no existe."""
        item = db.query(model_cls).filter(model_cls.id == catalog_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"{catalog_name} con ID {catalog_id} no encontrado")
        if hasattr(item, "price_per_m2"):
            return item.price_per_m2
        if hasattr(item, "price_per_unit"):
            return item.price_per_unit
        return 0.0

    @staticmethod
    def calculate_and_save(
        db: Session,
        project_id: str,
        aluminum_series_id: str,
        finish_id: str,
        glass_type_id: str,
        hardware_ids: List[str],
        height_m: float,
        width_m: float,
        quantity: int,
        notes: Optional[str] = None,
        discount_pct: float = 0.0,
        force_new: bool = True,
    ) -> Budget:
        """Calcula el presupuesto, crea nueva versión y la guarda."""
        from app.models.catalog import AluminumSeries, Finish, GlassType, Hardware

        # Validar proyecto
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")

        # Obtener precios de catálogos
        alum_price = BudgetService._get_catalog_price(db, AluminumSeries, aluminum_series_id, "Serie de aluminio")
        finish_price = BudgetService._get_catalog_price(db, Finish, finish_id, "Acabado")
        glass_price = BudgetService._get_catalog_price(db, GlassType, glass_type_id, "Vidrio")

        # Precio total de herrajes
        hardware_total = 0.0
        for hid in hardware_ids:
            hw_price = BudgetService._get_catalog_price(db, Hardware, hid, "Herraje")
            hardware_total += hw_price

        # Cálculos
        area_m2 = BudgetService._round2(height_m * width_m * quantity)
        material_cost = BudgetService._round2(
            (alum_price + finish_price + glass_price) * area_m2 + hardware_total * quantity
        )

        # Obtener costo de mano de obra por tipo de trabajo
        labor_cost_record = db.query(LaborCost).filter(
            LaborCost.job_type == project.project_type
        ).first()
        labor_cost_per_m2 = labor_cost_record.cost_per_m2 if labor_cost_record else 0.0
        labor_cost = BudgetService._round2(area_m2 * labor_cost_per_m2)

        subtotal = BudgetService._round2(material_cost + labor_cost)
        discount_amount = BudgetService._round2(subtotal * (discount_pct / 100))
        subtotal_after_discount = BudgetService._round2(subtotal - discount_amount)
        tax = BudgetService._round2(subtotal_after_discount * BudgetService.IVA_RATE)
        total = BudgetService._round2(subtotal_after_discount + tax)

        # Versionado: marcar presupuesto actual como no actual
        current = db.query(Budget).filter(
            Budget.project_id == project_id,
            Budget.is_current == True,
        ).first()
        new_version = 1
        if current:
            if not force_new:
                # Si no forzamos nueva, actualizamos el actual
                current.aluminum_series_id = aluminum_series_id
                current.finish_id = finish_id
                current.glass_type_id = glass_type_id
                current.height_m = height_m
                current.width_m = width_m
                current.quantity = quantity
                current.area_m2 = area_m2
                current.material_cost = material_cost
                current.labor_cost = labor_cost
                current.subtotal = subtotal
                current.tax = tax
                current.total = total
                current.discount_pct = discount_pct
                current.notes = notes
                db.commit()
                db.refresh(current)
                return current
            current.is_current = False
            new_version = current.version + 1

        # Crear nueva versión
        budget = Budget(
            project_id=project_id,
            version=new_version,
            aluminum_series_id=aluminum_series_id,
            finish_id=finish_id,
            glass_type_id=glass_type_id,
            height_m=height_m,
            width_m=width_m,
            quantity=quantity,
            area_m2=area_m2,
            material_cost=material_cost,
            labor_cost=labor_cost,
            subtotal=subtotal,
            tax=tax,
            total=total,
            discount_pct=discount_pct,
            notes=notes,
            is_current=True,
        )
        db.add(budget)
        db.flush()  # para obtener el ID antes de agregar hardware

        # Asociar hardware
        if hardware_ids:
            from app.models.catalog import Hardware
            hardware_items = db.query(Hardware).filter(Hardware.id.in_(hardware_ids)).all()
            budget.hardware = hardware_items

        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def get_current(db: Session, project_id: str) -> Optional[Budget]:
        return db.query(Budget).filter(
            Budget.project_id == project_id,
            Budget.is_current == True,
        ).first()

    @staticmethod
    def get_versions(db: Session, project_id: str) -> List[Budget]:
        return db.query(Budget).filter(
            Budget.project_id == project_id
        ).order_by(desc(Budget.version)).all()

    @staticmethod
    def get_by_version(db: Session, project_id: str, version: int) -> Optional[Budget]:
        return db.query(Budget).filter(
            Budget.project_id == project_id,
            Budget.version == version,
        ).first()

    @staticmethod
    def set_as_current(db: Session, project_id: str, version: int) -> Budget:
        target = BudgetService.get_by_version(db, project_id, version)
        if not target:
            raise HTTPException(status_code=404, detail="Versión de presupuesto no encontrada")
        # Marcar todas como no actuales
        db.query(Budget).filter(Budget.project_id == project_id).update({"is_current": False})
        target.is_current = True
        db.commit()
        db.refresh(target)
        return target
