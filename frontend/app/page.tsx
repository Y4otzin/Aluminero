export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">🏗️ Plataforma Herrería Aluminio</h1>
      <p className="mt-4 text-xl text-gray-600">Sistema integral de cotización y producción</p>
      <div className="mt-8">
        <a href="/auth/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Iniciar sesión
        </a>
      </div>
    </main>
  )
}
