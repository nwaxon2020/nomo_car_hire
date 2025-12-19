import Link from "next/link"

export default function Nav(){
    return(
        <div className="flex justify-between items-center p-4 sm:px-6 bg-gray-900">
            {/* Nav Link */}
            <Link href={"/"} className="p-1 flex gap-2 items-center justify-left bg-white rounded-sm">
                <h2 className="text-blue-600 font-bold inline">Nomo Cars</h2>
                <img src="/favicon.png" alt="favicon.png" className="w-5 h-4" />
                <i className="fa fa-car text-blue-600"></i>
            </Link>

            <Link href={"/"} className="hidden sm:block ">
                <i className="justify-right text-white fa fa-home cursor-pointer" style={{fontSize:"30px"}}></i>
            </Link>
        </div>
    )
}


















