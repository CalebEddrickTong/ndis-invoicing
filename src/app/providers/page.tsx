"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    Descriptions,
    Form,
    Input,
    Modal,
    Popconfirm,
    Table,
    Typography,
} from "antd";

const { Title } = Typography;

type Provider = {
    id: number;
    abn: string;
    name: string;
    email: string;
    phone_number: string | null;
    address: string;
    unit_building: string | null;
};

type ProviderFormValues = {
    abn: string;
    name: string;
    email: string;
    phone_number?: string;
    address: string;
    unit_building?: string;
};

export default function ProvidersPage() {
    const [form] = Form.useForm<ProviderFormValues>();

    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [editingProvider, setEditingProvider] =
        useState<Provider | null>(null);

    const [viewingProvider, setViewingProvider] =
        useState<Provider | null>(null);

    const [viewModalOpen, setViewModalOpen] = useState(false);

    async function loadProviders() {
        setLoading(true);

        try {
            const response = await fetch("/api/providers");
            const result = await response.json();

            if (response.ok) {
                setProviders(result.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setMounted(true);
        loadProviders();
    }, []);

    async function handleCreate(values: ProviderFormValues) {
        setSaving(true);

        try {
            const response = await fetch(
                editingProvider
                    ? `/api/providers/${editingProvider.id}`
                    : "/api/providers",
                {
                    method: editingProvider ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        abn: values.abn,
                        name: values.name,
                        email: values.email,
                        phone_number: values.phone_number || null,
                        address: values.address,
                        unit_building: values.unit_building || null,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    form.setFields(
                        Object.entries(result.errors).map(([name, error]) => ({
                            name: name as keyof ProviderFormValues,
                            errors: [String(error)],
                        }))
                    );
                }

                return;
            }

            form.resetFields();
            setModalOpen(false);
            setEditingProvider(null);
            await loadProviders();

        } finally {
            setSaving(false);
        }
    }

    async function handleViewProvider(id: number) {
        const response = await fetch(`/api/providers/${id}`);
        const result = await response.json();

        if (!response.ok) {
            return;
        }

        setViewingProvider(result.data);
        setViewModalOpen(true);
    }

    async function handleDeleteProvider(id: number) {
        const response = await fetch(`/api/providers/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            await loadProviders();
        }
    }

    return (
        <main className="p-6">
            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <Title level={2} style={{ margin: 0 }}>
                        Providers
                    </Title>

                    <Button
                        type="primary"
                        onClick={() => {
                            setEditingProvider(null);
                            form.resetFields();
                            setModalOpen(true);
                        }}
                    >
                        Add Provider
                    </Button>
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={[
                        {
                            title: "ABN",
                            dataIndex: "abn",
                        },
                        {
                            title: "Provider Name",
                            dataIndex: "name",
                        },
                        {
                            title: "Email",
                            dataIndex: "email",
                        },
                        {
                            title: "Phone Number",
                            dataIndex: "phone_number",
                        },
                        {
                            title: "Address",
                            dataIndex: "address",
                        },
                        {
                            title: "Actions",
                            key: "actions",
                            render: (_, provider: Provider) => (
                                <div className="flex gap-2">
                                    <Button
                                        type="link"
                                        onClick={() => handleViewProvider(provider.id)}
                                    >
                                        View
                                    </Button>

                                    <Button
                                        type="link"
                                        onClick={async () => {
                                            const response = await fetch(
                                                `/api/providers/${provider.id}`
                                            );
                                            const result = await response.json();

                                            if (response.ok) {
                                                setEditingProvider(result.data);

                                                form.setFieldsValue({
                                                    abn: result.data.abn,
                                                    name: result.data.name,
                                                    email: result.data.email,
                                                    phone_number:
                                                        result.data.phone_number ?? undefined,
                                                    address: result.data.address,
                                                    unit_building:
                                                        result.data.unit_building ?? undefined,
                                                });

                                                setModalOpen(true);
                                            }
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Popconfirm
                                        title="Delete provider?"
                                        description="This provider will be removed from the active list."
                                        okText="Delete"
                                        cancelText="Cancel"
                                        onConfirm={() =>
                                            handleDeleteProvider(provider.id)
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
                    dataSource={providers}
                    pagination={false}
                />
            </Card>

            {mounted && (
                <Modal
                    title={editingProvider ? "Edit Provider" : "Add Provider"}
                    open={modalOpen}
                    forceRender
                    onCancel={() => {
                        form.resetFields();
                        setEditingProvider(null);
                        setModalOpen(false);
                    }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    okText={editingProvider ? "Save Changes" : "Create Provider"}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreate}
                    >
                        <Form.Item
                            label="ABN"
                            name="abn"
                            rules={[
                                {
                                    required: true,
                                    message: "ABN is required.",
                                },
                                {
                                    pattern: /^\d{1,11}$/,
                                    message: "ABN must contain digits only, maximum 11 digits.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Provider Name"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    message: "Provider name is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: "Email is required.",
                                },
                                {
                                    type: "email",
                                    message: "Enter a valid email address.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Phone Number"
                            name="phone_number"
                            rules={[
                                {
                                    pattern: /^\d{3,16}$/,
                                    message: "Phone number must contain 3 to 16 digits.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Address"
                            name="address"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    message: "Address is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Unit / Building"
                            name="unit_building"
                            rules={[
                                {
                                    validator(_, value) {
                                        if (
                                            value === undefined ||
                                            value === null ||
                                            value === ""
                                        ) {
                                            return Promise.resolve();
                                        }

                                        if (
                                            typeof value === "string" &&
                                            value.trim().length > 0
                                        ) {
                                            return Promise.resolve();
                                        }

                                        return Promise.reject(
                                            new Error(
                                                "Unit / Building must not be empty if provided."
                                            )
                                        );
                                    },
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                    </Form>
                </Modal>
            )}

            {mounted && (
                <Modal
                    title="Provider Details"
                    open={viewModalOpen}
                    onCancel={() => {
                        setViewModalOpen(false);
                        setViewingProvider(null);
                    }}
                    footer={[
                        <Button
                            key="close"
                            onClick={() => {
                                setViewModalOpen(false);
                                setViewingProvider(null);
                            }}
                        >
                            Close
                        </Button>,
                    ]}
                    width={700}
                >
                    {viewingProvider && (
                        <Descriptions
                            bordered
                            column={2}
                            size="small"
                        >
                            <Descriptions.Item label="ABN">
                                {viewingProvider.abn}
                            </Descriptions.Item>

                            <Descriptions.Item label="Provider Name">
                                {viewingProvider.name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email">
                                {viewingProvider.email}
                            </Descriptions.Item>

                            <Descriptions.Item label="Phone Number">
                                {viewingProvider.phone_number ?? "-"}
                            </Descriptions.Item>

                            <Descriptions.Item
                                label="Unit / Building"
                                span={2}
                            >
                                {viewingProvider.unit_building ?? "-"}
                            </Descriptions.Item>

                            <Descriptions.Item
                                label="Address"
                                span={2}
                            >
                                {viewingProvider.address}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Modal>
            )}

        </main>
    );
}