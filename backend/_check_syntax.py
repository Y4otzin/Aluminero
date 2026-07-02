import ast, sys, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

files = [
    'app/models/quote.py',
    'app/models/__init__.py',
    'app/utils/pdf_generator.py',
    'app/services/pdf_service.py',
    'app/services/quote_service.py',
    'app/schemas/quote.py',
    'app/api/v1/quote/router.py',
    'app/api/v1/quote/__init__.py',
    'alembic/versions/f6a7b8c9d0e1_add_quote_and_quote_history_tables.py',
    'main.py',
]
ok = True
for f in files:
    try:
        with open(f) as fh:
            ast.parse(fh.read())
        print(f'OK {f}')
    except SyntaxError as e:
        print(f'FAIL {f}: {e}')
        ok = False
print()
print('ALL OK' if ok else 'SOME FAILED')
sys.exit(0 if ok else 1)
