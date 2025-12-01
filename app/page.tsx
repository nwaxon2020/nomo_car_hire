import HomeSidebarPageUi from "@/ui/home-sidebar";
import AuthGuard from "@/ui/auth-guard";
import HomePageUi from "@/ui/home";

export default function ProfilePage() {
    return(
        <AuthGuard>
          <div className="flex">         
            <HomeSidebarPageUi /> 
            <HomePageUi />          
          </div>   
        </AuthGuard>
    )
}