"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    Modal,
    Select,
    Table,
    Tag,
    Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { Title } = Typography;

type Invoice = {
    id: number;
    client_id: number | null;
    provider_id: number | null;
    invoice_number: string | null;
    invoice_date: string | null;
    amount: string | null;
    expected_amount: string | null;
    status: "drafted" | "completed";
    created_at: string;
    updated_at: string;
};

type Participant = {
    id: number;
    first_name: string;
    last_name: string;
};

type Provider = {
    id: number;
    name: string;
};

type InvoiceFormValues = {
    client_id?: number;
    provider_id?: number;
    invoice_number: string;
    invoice_date: Dayjs;
    expected_amount: string;
};

export default function InvoicesPage() {
    const [form] = Form.useForm<InvoiceFormValues>();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    async function loadInvoices() {
        setLoading(true);

        try {
            const response = await fetch("/api/invoices");
            const result = await response.json();

            if (response.ok) {
                setInvoices(result.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setMounted(true);

        async function loadPageData() {
            const [participantsResponse, providersResponse] =
                await Promise.all([
                    fetch("/api/participants"),
                    fetch("/api/providers"),
                ]);

            const participantsResult =
                await participantsResponse.json();
            const providersResult =
                await providersResponse.json();

            if (participantsResponse.ok) {
                setParticipants(participantsResult.data ?? []);
            }

            if (providersResponse.ok) {
                setProviders(providersResult.data ?? []);
            }

            await loadInvoices();
        }

        loadPageData();
    }, []);

    async function handleCreateDraft(values: InvoiceFormValues) {
        setSaving(true);

        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: values.client_id ?? null,
                    provider_id: values.provider_id ?? null,
                    invoice_number: values.invoice_number,
                    invoice_date: values.invoice_date.format("YYYY-MM-DD"),
                    expected_amount: values.expected_amount,
                    status: "drafted",
                    items: [],
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    form.setFields(
                        Object.entries(result.errors).map(([name, error]) => ({
                            name: name as keyof InvoiceFormValues,
                            errors: [String(error)],
                        }))
                    );
                }

                return;
            }

            form.resetFields();
            setModalOpen(false);
            await loadInvoices();
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="p-6">
            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <Title level={2} style={{ margin: 0 }}>
                        Invoices
                    </Title>

                    <Button
                        type="primary"
                        onClick={() => {
                            form.resetFields();
                            setModalOpen(true);
                        }}
                    >
                        Create Invoice
                    </Button>
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={[
                        {
                            title: "Invoice Number",
                            dataIndex: "invoice_number",
                            render: (value: string | null) =>
                                value ?? "-",
                        },
                        {
                            title: "Invoice Date",
                            dataIndex: "invoice_date",
                            render: (value: string | null) =>
                                value
                                    ? dayjs(value).format("YYYY-MM-DD")
                                    : "-",
                        },
                        {
                            title: "Participant",
                            dataIndex: "client_id",
                            render: (value: number | null) => {
                                if (!value) return "-";

                                const participant = participants.find(
                                    (item) => item.id === value
                                );

                                return participant
                                    ? `${participant.first_name} ${participant.last_name}`
                                    : `#${value}`;
                            },
                        },
                        {
                            title: "Provider",
                            dataIndex: "provider_id",
                            render: (value: number | null) => {
                                if (!value) return "-";

                                const provider = providers.find(
                                    (item) => item.id === value
                                );

                                return provider
                                    ? provider.name
                                    : `#${value}`;
                            },
                        },
                        {
                            title: "Amount",
                            dataIndex: "amount",
                            render: (value: string | null) =>
                                value
                                    ? `AUD ${Number(value).toFixed(2)}`
                                    : "-",
                        },
                        {
                            title: "Expected Amount",
                            dataIndex: "expected_amount",
                            render: (value: string | null) =>
                                value
                                    ? `AUD ${Number(value).toFixed(2)}`
                                    : "-",
                        },
                        {
                            title: "Status",
                            dataIndex: "status",
                            render: (
                                value: "drafted" | "completed"
                            ) => (
                                <Tag
                                    color={
                                        value === "completed"
                                            ? "success"
                                            : "default"
                                    }
                                >
                                    {value === "completed"
                                        ? "Completed"
                                        : "Draft"}
                                </Tag>
                            ),
                        },
                    ]}
                    dataSource={invoices}
                    pagination={false}
                />
            </Card>

            {mounted && (
                <Modal
                    title="Create Invoice Draft"
                    open={modalOpen}
                    forceRender
                    onCancel={() => {
                        form.resetFields();
                        setModalOpen(false);
                    }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    okText="Save Draft"
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreateDraft}
                    >
                        <Form.Item
                            label="Invoice Number"
                            name="invoice_number"
                            rules={[
                                {
                                    required: true,
                                    message: "Invoice number is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Invoice Date"
                            name="invoice_date"
                            rules={[
                                {
                                    required: true,
                                    message: "Invoice date is required.",
                                },
                            ]}
                        >
                            <DatePicker
                                format="YYYY-MM-DD"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Expected Amount"
                            name="expected_amount"
                            rules={[
                                {
                                    required: true,
                                    message: "Expected amount is required.",
                                },
                            ]}
                        >
                            <Input prefix="AUD" inputMode="decimal" />
                        </Form.Item>

                        <Form.Item
                            label="Participant"
                            name="client_id"
                        >
                            <Select
                                allowClear
                                placeholder="Select participant"
                                options={participants.map((participant) => ({
                                    value: participant.id,
                                    label: `${participant.first_name} ${participant.last_name}`,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Provider"
                            name="provider_id"
                        >
                            <Select
                                allowClear
                                placeholder="Select provider"
                                options={providers.map((provider) => ({
                                    value: provider.id,
                                    label: provider.name,
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}

        </main>
    );
}