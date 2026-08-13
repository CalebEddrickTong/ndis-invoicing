"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
    Button,
    Card,
    DatePicker,
    Descriptions,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Table,
    Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { Title } = Typography;


type Participant = {
    id: number;
    ndis_number: string;
    first_name: string;
    last_name: string;
    email: string;
    pricing_region: string;
};

type ParticipantDetail = Participant & {
    gender_id: number;
    dob: string;
    phone_number: string | null;
    address: string;
    unit_building: string | null;
};

type Gender = {
    id: number;
    code: string;
    label: string;
};

type PricingRegion = {
    code: string;
    label: string;
    full_label: string;
};

type ParticipantFormValues = {
    first_name: string;
    last_name: string;
    gender_id: number;
    dob: Dayjs;
    ndis_number: string;
    email: string;
    phone_number?: string;
    address: string;
    unit_building?: string;
    pricing_region: string;
};

export default function ParticipantsPage() {
    const emptySubscribe = () => () => { };
    const getClientSnapshot = () => true;
    const getServerSnapshot = () => false;

    const [form] = Form.useForm<ParticipantFormValues>();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [genders, setGenders] = useState<Gender[]>([]);
    const [pricingRegions, setPricingRegions] = useState<PricingRegion[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const mounted = useSyncExternalStore(
        emptySubscribe,
        getClientSnapshot,
        getServerSnapshot
    );

    const [editingParticipant, setEditingParticipant] =
        useState<Participant | null>(null);

    const [viewingParticipant, setViewingParticipant] =
        useState<ParticipantDetail | null>(null);

    const [viewModalOpen, setViewModalOpen] = useState(false);

    async function loadParticipants() {

        try {
            const response = await fetch("/api/participants");
            const result = await response.json();

            if (response.ok) {
                setParticipants(result.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadParticipants();

        fetch("/api/participants/lookups")
            .then(async (response) => ({
                response,
                result: await response.json(),
            }))
            .then(({ response, result }) => {
                if (response.ok) {
                    setGenders(result.data?.genders ?? []);
                    setPricingRegions(result.data?.pricing_regions ?? []);
                }
            });
    }, []);

    async function handleCreate(values: ParticipantFormValues) {
        setSaving(true);

        try {
            const response = await fetch(
                editingParticipant
                    ? `/api/participants/${editingParticipant.id}`
                    : "/api/participants",
                {
                    method: editingParticipant ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    gender_id: values.gender_id,
                    dob: values.dob.format("YYYY-MM-DD"),
                    ndis_number: values.ndis_number,
                    email: values.email,
                    phone_number: values.phone_number || null,
                    address: values.address,
                    unit_building: values.unit_building || null,
                    pricing_region: values.pricing_region,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    form.setFields(
                        Object.entries(result.errors).map(([name, error]) => ({
                            name: name as keyof ParticipantFormValues,
                            errors: [String(error)],
                        }))
                    );
                }

                return;
            }

            form.resetFields();
            setModalOpen(false);
            setEditingParticipant(null);
            await loadParticipants();
        } finally {
            setSaving(false);
        }
    }

    async function handleViewParticipant(id: number) {
        const response = await fetch(`/api/participants/${id}`);
        const result = await response.json();

        if (!response.ok) {
            return;
        }

        setViewingParticipant(result.data);
        setViewModalOpen(true);
    }

    async function handleDeleteParticipant(id: number) {
        const response = await fetch(`/api/participants/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            await loadParticipants();
        }
    }

    return (
        <main className="p-6">
            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <Title level={2} style={{ margin: 0 }}>
                        Participants
                    </Title>

                    <Button
                        type="primary"
                        onClick={() => {
                            setEditingParticipant(null);
                            form.resetFields();
                            setModalOpen(true);
                        }}
                    >
                        Add Participant
                    </Button>
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={[
                        {
                            title: "NDIS Number",
                            dataIndex: "ndis_number",
                        },
                        {
                            title: "First Name",
                            dataIndex: "first_name",
                        },
                        {
                            title: "Last Name",
                            dataIndex: "last_name",
                        },
                        {
                            title: "Email",
                            dataIndex: "email",
                        },
                        {
                            title: "Pricing Region",
                            dataIndex: "pricing_region",
                        },
                        {
                            title: "Actions",
                            key: "actions",
                            render: (_, participant: Participant) => (
                                <div className="flex gap-2">
                                    <Button
                                        type="link"
                                        onClick={() => handleViewParticipant(participant.id)}
                                    >
                                        View
                                    </Button>

                                    <Button
                                        type="link"
                                        onClick={async () => {
                                            const response = await fetch(
                                                `/api/participants/${participant.id}`
                                            );
                                            const result = await response.json();

                                            if (response.ok) {
                                                setEditingParticipant(result.data);

                                                form.setFieldsValue({
                                                    first_name: result.data.first_name,
                                                    last_name: result.data.last_name,
                                                    gender_id: result.data.gender_id,
                                                    dob: dayjs(result.data.dob),
                                                    ndis_number: result.data.ndis_number,
                                                    email: result.data.email,
                                                    phone_number:
                                                        result.data.phone_number ?? undefined,
                                                    address: result.data.address,
                                                    unit_building:
                                                        result.data.unit_building ?? undefined,
                                                    pricing_region:
                                                        result.data.pricing_region,
                                                });

                                                setModalOpen(true);
                                            }
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Popconfirm
                                        title="Delete participant?"
                                        description="This participant will be removed from the active list."
                                        okText="Delete"
                                        cancelText="Cancel"
                                        onConfirm={() =>
                                            handleDeleteParticipant(participant.id)
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
                    dataSource={participants}
                    pagination={false}
                />
            </Card>

            {mounted && (
                <Modal
                    title={editingParticipant ? "Edit Participant" : "Add Participant"}
                    open={modalOpen}
                    forceRender
                    onCancel={() => {
                        form.resetFields();
                        setEditingParticipant(null);
                        setModalOpen(false);
                    }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    okText={editingParticipant ? "Save Changes" : "Create Participant"}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreate}
                    >
                        <Form.Item
                            label="First Name"
                            name="first_name"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    message: "First name is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Last Name"
                            name="last_name"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    message: "Last name is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Gender"
                            name="gender_id"
                            rules={[{ required: true, message: "Gender is required." }]}
                        >
                            <Select
                                options={genders.map((gender) => ({
                                    value: gender.id,
                                    label: gender.label,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Date of Birth"
                            name="dob"
                            rules={[{ required: true, message: "Date of birth is required." }]}
                        >
                            <DatePicker
                                format="YYYY-MM-DD"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="NDIS Number"
                            name="ndis_number"
                            rules={[
                                {
                                    required: true,
                                    message: "NDIS number is required.",
                                },
                                {
                                    pattern: /^\d{1,16}$/,
                                    message: "NDIS number must contain digits only, maximum 16 digits.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: "Email is required." },
                                { type: "email", message: "Enter a valid email address." },
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

                        <Form.Item
                            label="Pricing Region"
                            name="pricing_region"
                            rules={[
                                { required: true, message: "Pricing region is required." },
                            ]}
                        >
                            <Select
                                options={pricingRegions.map((region) => ({
                                    value: region.code,
                                    label:
                                        region.label === region.full_label
                                            ? region.label
                                            : `${region.label} - ${region.full_label}`,
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}

            {mounted && (
                <Modal
                    title="Participant Details"
                    open={viewModalOpen}
                    onCancel={() => {
                        setViewModalOpen(false);
                        setViewingParticipant(null);
                    }}
                    footer={[
                        <Button
                            key="close"
                            onClick={() => {
                                setViewModalOpen(false);
                                setViewingParticipant(null);
                            }}
                        >
                            Close
                        </Button>,
                    ]}
                    width={700}
                >
                    {viewingParticipant && (
                        <Descriptions
                            bordered
                            column={2}
                            size="small"
                        >
                            <Descriptions.Item label="NDIS Number">
                                {viewingParticipant.ndis_number}
                            </Descriptions.Item>

                            <Descriptions.Item label="Name">
                                {viewingParticipant.first_name}{" "}
                                {viewingParticipant.last_name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Gender">
                                {genders.find(
                                    (gender) =>
                                        gender.id === viewingParticipant.gender_id
                                )?.label ?? "-"}
                            </Descriptions.Item>

                            <Descriptions.Item label="Date of Birth">
                                {viewingParticipant.dob
                                    ? viewingParticipant.dob.slice(0, 10)
                                    : "-"}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email">
                                {viewingParticipant.email}
                            </Descriptions.Item>

                            <Descriptions.Item label="Phone Number">
                                {viewingParticipant.phone_number ?? "-"}
                            </Descriptions.Item>

                            <Descriptions.Item label="Pricing Region">
                                {(() => {
                                    const region = pricingRegions.find(
                                        (item) =>
                                            item.code ===
                                            viewingParticipant.pricing_region
                                    );

                                    if (!region) {
                                        return viewingParticipant.pricing_region;
                                    }

                                    return region.label === region.full_label
                                        ? region.label
                                        : `${region.label} - ${region.full_label}`;
                                })()}
                            </Descriptions.Item>

                            <Descriptions.Item label="Unit / Building">
                                {viewingParticipant.unit_building ?? "-"}
                            </Descriptions.Item>

                            <Descriptions.Item
                                label="Address"
                                span={2}
                            >
                                {viewingParticipant.address}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Modal>
            )}

        </main>
    );
}

