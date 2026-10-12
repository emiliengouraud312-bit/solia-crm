import { Outlet } from 'react-router'
import { BandeauDate } from './BandeauDate'
import { BarreLaterale } from './BarreLaterale'

export function MiseEnPage() {
  return (
    <div className="flex min-h-screen">
      <BarreLaterale />
      <div className="flex min-w-0 flex-1 flex-col">
        <BandeauDate />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
