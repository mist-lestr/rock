import { userManager } from "@/auth";
import { ModeToggle } from "@/components/app/mode-toggle";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";

export default function Navbar() {

  const login = () => userManager.signinRedirect();
  const logout = () => userManager.signoutRedirect();

  return (
    <>
        <h1 className="pl-4 scroll-m-20 text-center text-2xl font-extrabold tracking-tight text-balance">Lestr</h1>
        <div className="ml-auto flex items-center gap-2 pr-4">
          <NavigationMenu>
            <NavigationMenuItem>
              <NavigationMenuLink>
                <button onClick={login}>Login with OIDC</button>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink>
                <button onClick={logout}>Logout</button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenu>
          <ModeToggle />
        </div>
    </>
  );
}