import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import './globals.css';

export const metadata = {
  title: "ImmiPulse - Yutian Newsroom",
  description: "AI-powered immigration newsroom",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="app-main">
            {children}
          </div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
