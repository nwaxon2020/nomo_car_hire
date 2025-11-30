import HomePageUi from "@/ui/home";
import AuthGuard from "@/ui/auth-guard";

export default function ProfilePage() {
    return(
        <AuthGuard>
          <HomePageUi />         
        </AuthGuard>
    )
}