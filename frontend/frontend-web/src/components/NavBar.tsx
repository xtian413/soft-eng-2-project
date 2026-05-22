import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/app', icon: 'dashboard', fill: 1 },
  { label: 'Food', to: '/app/food', icon: 'restaurant', fill: 0 },
  {
    label: 'Coach',
    to: '/app/coach',
    icon: 'auto_awesome',
    fill: 1,
    isCenter: true,
  },
  { label: 'Lift', to: '/app/lift', icon: 'fitness_center', fill: 0 },
  { label: 'Profile', to: '/app/profile', icon: 'person', fill: 0 },
]

function NavBar() {
  const location = useLocation()
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.to === location.pathname),
  )
  const indicatorLeft = `${(activeIndex + 0.5) * (100 / navItems.length)}%`

  return (
    <nav
      className="md:hidden fixed bottom-6 left-4 right-4 z-50 flex justify-around items-center h-16 bg-white/80 backdrop-blur-[16px] shadow-[0px_8px_32px_rgba(0,0,0,0.08)] rounded-full"
      aria-label="Primary"
    >
      <div
        className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-[#0EA5E9] -translate-x-1/2 nav-dot-transition"
        style={{ left: indicatorLeft }}
      />
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) => {
            if (item.isCenter) {
              return (
                'relative -top-3 flex flex-col items-center justify-center text-white ' +
                'bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] rounded-full ' +
                'w-14 h-14 active:scale-90 transition-all duration-300 animate-pulse-shadow z-20'
              )
            }

            return (
              'w-12 h-12 flex flex-col items-center justify-center ' +
              (isActive ? 'text-[#0EA5E9]' : 'text-[#64748B]') +
              ' hover:text-[#0EA5E9] active:scale-90 transition-all duration-300 z-10'
            )
          }}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: `'FILL' ${item.fill}` }}
          >
            {item.icon}
          </span>
          {item.isCenter ? null : (
            <span className="font-bold text-[10px] mt-0.5">{item.label}</span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default NavBar
