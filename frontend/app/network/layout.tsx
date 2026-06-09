export default function NetworkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-home-theme min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
