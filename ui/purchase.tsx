"use client"

import { useRouter } from "next/navigation";



export default function PurchaseVIPPageUi(){

    const router = useRouter()

    return(
        <div className="relative p-5">
           <h1 className="font-black text-2xl p-2 underline text-green-700"> Pay For Vip</h1>

            {/* Close window button */}
            <div 
            onClick={() => router.back()}
            className="border rounded-md py-1 px-3 cursor-pointer text-xl sm:text-2xl text-center mt-4 absolute top-3  right-7 text-gray-900 font-bold">     
            x
            </div>
        </div>
    )
}