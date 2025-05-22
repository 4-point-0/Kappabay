export const metadata = {
  title: "KappaBae – Your AI Companion",
  // you can add other per‐section metadata here
}

export default function KappabaeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // apply the "kappabae" theme class on all /kappabae routes
    <div className="kappabae">
      {children}
    </div>
  )
}
