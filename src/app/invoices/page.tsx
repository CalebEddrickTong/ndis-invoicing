"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
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

type InvoiceItemFormValues = {
    rate_set_id?: number;
    category_id?: number;
    support_item_id?: number;
    start_date?: Dayjs;
    end_date?: Dayjs;
    unit?: number;
    input_rate?: number;
};

type InvoiceFormValues = {
    client_id?: number;
    provider_id?: number;
    invoice_number: string;
    invoice_date: Dayjs;
    expected_amount: number;
    status: "drafted" | "completed";
    items?: InvoiceItemFormValues[];
};

type RateSetLookup = {
    id: number;
    name: string;
    start_date: string;
    end_date: string | null;
};

type CategoryLookup = {
    id: number;
    rate_set_id: number;
    category_number: string;
    category_name: string;
    sorting: number;
};

type SupportItemLookup = {
    id: number;
    rate_set_id: number;
    category_id: number;
    item_number: string;
    item_name: string;
    unit: string | null;
    sorting: number;
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

    const [rateSets, setRateSets] = useState<RateSetLookup[]>([]);
    const [categories, setCategories] = useState<CategoryLookup[]>([]);
    const [supportItems, setSupportItems] = useState<SupportItemLookup[]>([]);

    const [editingInvoice, setEditingInvoice] =
        useState<Invoice | null>(null);

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
            const [
                participantsResponse,
                providersResponse,
                lookupsResponse,
            ] = await Promise.all([
                fetch("/api/participants"),
                fetch("/api/providers"),
                fetch("/api/invoices/lookups"),
            ]);

            const participantsResult =
                await participantsResponse.json();
            const providersResult =
                await providersResponse.json();
            const lookupsResult =
                await lookupsResponse.json();

            if (participantsResponse.ok) {
                setParticipants(participantsResult.data ?? []);
            }

            if (providersResponse.ok) {
                setProviders(providersResult.data ?? []);
            }

            if (lookupsResponse.ok) {
                setRateSets(lookupsResult.data?.rate_sets ?? []);
                setCategories(lookupsResult.data?.categories ?? []);
                setSupportItems(lookupsResult.data?.support_items ?? []);
            }

            await loadInvoices();
        }

        loadPageData();
    }, []);

    async function handleSaveInvoice(values: InvoiceFormValues) {
        setSaving(true);

        try {
            const response = await fetch(
                editingInvoice
                    ? `/api/invoices/${editingInvoice.id}`
                    : "/api/invoices",
                {
                    method: editingInvoice ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: values.client_id ?? null,
                        provider_id: values.provider_id ?? null,
                        invoice_number: values.invoice_number,
                        invoice_date: values.invoice_date.format("YYYY-MM-DD"),
                        expected_amount: values.expected_amount,
                        status: values.status,
                        items: (values.items ?? []).map((item) => ({
                            rate_set_id: item.rate_set_id ?? null,
                            category_id: item.category_id ?? null,
                            support_item_id: item.support_item_id ?? null,
                            start_date: item.start_date
                                ? item.start_date.format("YYYY-MM-DD")
                                : null,
                            end_date: item.end_date
                                ? item.end_date.format("YYYY-MM-DD")
                                : null,
                            unit: item.unit ?? null,
                            input_rate: item.input_rate ?? null,
                        })),
                    }),
                }
            );

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
            setEditingInvoice(null);
            await loadInvoices();
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteInvoice(id: number) {
        const response = await fetch(`/api/invoices/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            await loadInvoices();
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
                            setEditingInvoice(null);
                            form.resetFields();
                            form.setFieldsValue({
                                status: "drafted",
                            });
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
                        {
                            title: "Actions",
                            key: "actions",
                            render: (_, invoice: Invoice) => (
                                <div className="flex gap-2">
                                    <Button
                                        type="link"
                                        onClick={async () => {
                                            const response = await fetch(
                                                `/api/invoices/${invoice.id}`
                                            );
                                            const result = await response.json();

                                            if (!response.ok) {
                                                return;
                                            }

                                            const detail = result.data;

                                            setEditingInvoice(detail);

                                            form.setFieldsValue({
                                                client_id: detail.client_id ?? undefined,
                                                provider_id: detail.provider_id ?? undefined,
                                                invoice_number: detail.invoice_number,
                                                invoice_date: detail.invoice_date
                                                    ? dayjs(detail.invoice_date)
                                                    : undefined,
                                                expected_amount:
                                                    detail.expected_amount !== null
                                                        ? Number(detail.expected_amount)
                                                        : 0,
                                                status: detail.status,
                                                items: (detail.items ?? []).map(
                                                    (item: {
                                                        rate_set_id: number | null;
                                                        category_id: number | null;
                                                        support_item_id: number | null;
                                                        start_date: string | null;
                                                        end_date: string | null;
                                                        unit: string | null;
                                                        input_rate: string | null;
                                                    }) => ({
                                                        rate_set_id:
                                                            item.rate_set_id ?? undefined,
                                                        category_id:
                                                            item.category_id ?? undefined,
                                                        support_item_id:
                                                            item.support_item_id ?? undefined,
                                                        start_date: item.start_date
                                                            ? dayjs(item.start_date)
                                                            : undefined,
                                                        end_date: item.end_date
                                                            ? dayjs(item.end_date)
                                                            : undefined,
                                                        unit:
                                                            item.unit !== null
                                                                ? Number(item.unit)
                                                                : undefined,
                                                        input_rate:
                                                            item.input_rate !== null
                                                                ? Number(item.input_rate)
                                                                : undefined,
                                                    })
                                                ),
                                            });

                                            setModalOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Popconfirm
                                        title="Delete invoice?"
                                        description="This invoice will be removed from the active list."
                                        okText="Delete"
                                        cancelText="Cancel"
                                        onConfirm={() =>
                                            handleDeleteInvoice(invoice.id)
                                        }
                                    >
                                        <Button type="link" danger>
                                            Delete
                                        </Button>
                                    </Popconfirm>
                                </div>
                            ),
                        },
                    ]}
                    dataSource={invoices}
                    pagination={false}
                />
            </Card>

            {mounted && (
                <Modal
                    title={
                        editingInvoice
                            ? "Edit Invoice"
                            : "Create Invoice"
                    }
                    open={modalOpen}
                    forceRender
                    onCancel={() => {
                        form.resetFields();
                        setEditingInvoice(null);
                        setModalOpen(false);
                    }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    okText={
                        editingInvoice
                            ? "Save Changes"
                            : "Save Invoice"
                    }
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSaveInvoice}
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
                            <InputNumber
                                min={0}
                                step={0.01}
                                precision={2}
                                controls={false}
                                prefix="AUD"
                                style={{ width: "100%" }}
                                placeholder="0.00"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Status"
                            name="status"
                            rules={[
                                {
                                    required: true,
                                    message: "Status is required.",
                                },
                            ]}
                        >
                            <Select
                                options={[
                                    {
                                        value: "drafted",
                                        label: "Draft",
                                    },
                                    {
                                        value: "completed",
                                        label: "Completed",
                                    },
                                ]}
                            />
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

                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <>
                                    <div className="mb-3 flex items-center justify-between">
                                        <strong>Invoice Items</strong>

                                        <Button
                                            type="dashed"
                                            onClick={() => add()}
                                        >
                                            Add Line Item
                                        </Button>
                                    </div>

                                    {fields.map((field, index) => (
                                        <Card
                                            key={field.key}
                                            size="small"
                                            className="mb-3"
                                            title={`Item ${index + 1}`}
                                            extra={
                                                <Button
                                                    type="link"
                                                    danger
                                                    onClick={() => remove(field.name)}
                                                >
                                                    Remove
                                                </Button>
                                            }
                                        >
                                            <Form.Item
                                                label="Rate Set"
                                                name={[field.name, "rate_set_id"]}
                                            >
                                                <Select
                                                    allowClear
                                                    showSearch={{
                                                        optionFilterProp: "label",
                                                    }}
                                                    options={rateSets.map((rateSet) => ({
                                                        value: rateSet.id,
                                                        label: rateSet.name,
                                                    }))}
                                                    onChange={() => {
                                                        form.setFieldValue(
                                                            ["items", field.name, "category_id"],
                                                            undefined
                                                        );
                                                        form.setFieldValue(
                                                            ["items", field.name, "support_item_id"],
                                                            undefined
                                                        );
                                                    }}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                noStyle
                                                shouldUpdate={(previous, current) =>
                                                    previous.items?.[field.name]?.rate_set_id !==
                                                    current.items?.[field.name]?.rate_set_id
                                                }
                                            >
                                                {() => {
                                                    const selectedRateSetId = form.getFieldValue([
                                                        "items",
                                                        field.name,
                                                        "rate_set_id",
                                                    ]);

                                                    return (
                                                        <Form.Item
                                                            label="Category"
                                                            name={[field.name, "category_id"]}
                                                        >
                                                            <Select
                                                                allowClear
                                                                showSearch={{
                                                                    optionFilterProp: "label",
                                                                }}
                                                                disabled={!selectedRateSetId}
                                                                options={categories
                                                                    .filter(
                                                                        (category) =>
                                                                            category.rate_set_id ===
                                                                            selectedRateSetId
                                                                    )
                                                                    .map((category) => ({
                                                                        value: category.id,
                                                                        label: `${category.category_number} - ${category.category_name}`,
                                                                    }))}
                                                                onChange={() => {
                                                                    form.setFieldValue(
                                                                        [
                                                                            "items",
                                                                            field.name,
                                                                            "support_item_id",
                                                                        ],
                                                                        undefined
                                                                    );
                                                                }}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>

                                            <Form.Item
                                                noStyle
                                                shouldUpdate={(previous, current) =>
                                                    previous.items?.[field.name]?.category_id !==
                                                    current.items?.[field.name]?.category_id
                                                }
                                            >
                                                {() => {
                                                    const selectedRateSetId = form.getFieldValue([
                                                        "items",
                                                        field.name,
                                                        "rate_set_id",
                                                    ]);

                                                    const selectedCategoryId = form.getFieldValue([
                                                        "items",
                                                        field.name,
                                                        "category_id",
                                                    ]);

                                                    return (
                                                        <Form.Item
                                                            label="Support Item"
                                                            name={[field.name, "support_item_id"]}
                                                        >
                                                            <Select
                                                                allowClear
                                                                showSearch={{
                                                                    optionFilterProp: "label",
                                                                }}
                                                                disabled={!selectedCategoryId}
                                                                options={supportItems
                                                                    .filter(
                                                                        (item) =>
                                                                            item.rate_set_id ===
                                                                            selectedRateSetId &&
                                                                            item.category_id ===
                                                                            selectedCategoryId
                                                                    )
                                                                    .map((item) => ({
                                                                        value: item.id,
                                                                        label: `${item.item_number} - ${item.item_name}`,
                                                                    }))}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>

                                            <Space
                                                orientation="vertical"
                                                style={{ width: "100%" }}
                                            >
                                                <Form.Item
                                                    label="Start Date"
                                                    name={[field.name, "start_date"]}
                                                >
                                                    <DatePicker
                                                        format="YYYY-MM-DD"
                                                        style={{ width: "100%" }}
                                                    />
                                                </Form.Item>

                                                <Form.Item label="End Date"
                                                    name={[field.name, "end_date"]}
                                                    dependencies={[
                                                        ["items", field.name, "start_date"],
                                                    ]}
                                                    rules={[
                                                        ({ getFieldValue }) => ({
                                                            validator(_, value) {
                                                                const startDate = getFieldValue([
                                                                    "items",
                                                                    field.name,
                                                                    "start_date",
                                                                ]);

                                                                if (
                                                                    !value ||
                                                                    !startDate ||
                                                                    !value.isBefore(startDate, "day")
                                                                ) {
                                                                    return Promise.resolve();
                                                                }

                                                                return Promise.reject(
                                                                    new Error(
                                                                        "End date must be on or after the start date."
                                                                    )
                                                                );
                                                            },
                                                        }),
                                                    ]}
                                                >
                                                    <DatePicker
                                                        format="YYYY-MM-DD"
                                                        style={{ width: "100%" }}
                                                        disabledDate={(current) => {
                                                            const startDate = form.getFieldValue([
                                                                "items",
                                                                field.name,
                                                                "start_date",
                                                            ]);

                                                            return Boolean(
                                                                startDate &&
                                                                current.isBefore(startDate, "day")
                                                            );
                                                        }}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    label="Quantity / Units"
                                                    name={[field.name, "unit"]}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        step={1}
                                                        precision={0}
                                                        controls
                                                        style={{ width: "100%" }}
                                                        placeholder="0"
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    label="Input Rate"
                                                    name={[field.name, "input_rate"]}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        step={0.01}
                                                        precision={2}
                                                        controls={false}
                                                        prefix="AUD"
                                                        style={{ width: "100%" }}
                                                        placeholder="0.00"
                                                    />
                                                </Form.Item>
                                            </Space>
                                        </Card>
                                    ))}
                                </>
                            )}
                        </Form.List>
                    </Form>
                </Modal>
            )}

        </main>
    );
}