import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContractDetailWorkspace } from "@/components/ContractDetailWorkspace";
export const dynamic = "force-dynamic";
export default async function ContractPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><Header/><ContractDetailWorkspace contractId={Number(id)}/><Footer/></>;}
