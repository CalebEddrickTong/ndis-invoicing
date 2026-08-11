import type { Metadata } from "next";
import Link from "next/link";
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
            <body className="min-h-full bg-gray-50">
                <AntdRegistry>
                    <header className="border-b bg-white">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-8 px-6 py-4">
                            <Link
                                href="/"
                                className="shrink-0 text-xl font-semibold text-gray-900"
                            >
                                NDIS Invoicing
                            </Link>

                            <nav className="flex flex-wrap items-center gap-2">
                                <Link
                                    href="/participants"
                                    className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                >
                                    Participants
                                </Link>

                                <Link
                                    href="/providers"
                                    className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                >
                                    Providers
                                </Link>

                                <Link
                                    href="/rate-sets"
                                    className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                >
                                    Rate Sets
                                </Link>

                                <Link
                                    href="/invoices"
                                    className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                >
                                    Invoices
                                </Link>
                            </nav>
                        </div>
                    </header>

                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </AntdRegistry>
            </body>
        </html>
    );
}