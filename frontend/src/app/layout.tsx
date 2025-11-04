import './globals.css'
import Providers from './Providers'

export const metadata = {
  title: 'Post Manager',
  description: 'Simple Post Manager frontend',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
