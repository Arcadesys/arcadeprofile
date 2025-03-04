
import type { Metadata } from "next";
import "./globals.css";
import React, { useState } from 'react';
import NavBar from './components/NavBar.js';



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
