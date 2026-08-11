import Link from "next/link";

const modules = [
    {
        title: "Participants",
        description: "Manage NDIS participant records and pricing regions.",
        href: "/participants",
    },
    {
        title: "Providers",
        description: "Manage NDIS service provider details.",
        href: "/providers",
    },
    {
        title: "Rate Sets",
        description:
            "Manage NDIS rate sets and import Support Catalogue Excel files.",
        href: "/rate-sets",
    },
    {
        title: "Invoices",
        description:
            "Create, review, edit and complete NDIS invoices.",
        href: "/invoices",
    },
];

export default function Home() {
    return (
        <main className="p-6">
            <div className="mb-8">
                <h1 className="mb-2 text-4xl font-semibold text-gray-900">
                    NDIS Invoicing Platform
                </h1>

                <p className="text-lg text-gray-600">
                    Manage participants, providers, NDIS pricing data and
                    invoices.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {modules.map((module) => (
                    <Link
                        key={module.href}
                        href={module.href}
                        className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                    >
                        <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                            {module.title}
                        </h2>

                        <p className="text-gray-600">
                            {module.description}
                        </p>
                    </Link>
                ))}
            </div>
        </main>
    );
}