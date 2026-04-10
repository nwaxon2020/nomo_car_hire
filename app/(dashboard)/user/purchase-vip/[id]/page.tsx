import PurchasePage from "@/ui/purchase";

interface PageProps {
    params: Promise<{
        id: string;
    }>
}

export default async function PurchaseVipPage({ params }: PageProps) {
    const { id } = await params;
    return <PurchasePage userIdProp={id} />
}
