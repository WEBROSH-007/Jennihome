import { Geist, Geist_Mono, Mulish } from "next/font/google";


import "./globals.css";



const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"], // Optional: Add the weights you need
});



export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${mulish.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
