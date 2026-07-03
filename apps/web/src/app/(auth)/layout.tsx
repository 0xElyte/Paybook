export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-route-in grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">{children}</div>
  )
}
