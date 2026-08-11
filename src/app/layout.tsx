import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

export const metadata: Metadata = {
    title: "NDIS Invoicing",
    description: "NDIS invoicing platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="min-h-full">
                <AntdRegistry>{children}</AntdRegistry>
            </body>
        </html>
    );
}