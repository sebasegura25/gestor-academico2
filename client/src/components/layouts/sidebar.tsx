import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  HomeIcon, 
  BookIcon, 
  ClipboardIcon, 
  UserIcon, 
  CalendarPlusIcon,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";

const navItems = [
  { path: "/", label: "Dashboard", icon: HomeIcon },
  { path: "/careers", label: "Carreras", icon: BookIcon },
  { path: "/students", label: "Legajos", icon: UserIcon },
  { path: "/enrollments", label: "Inscripciones", icon: CalendarPlusIcon },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const NavList = () => (
    <nav className="p-2">
      <div className="text-[#8e8e93] uppercase text-xs font-semibold px-3 mt-4 mb-2">
        Módulos
      </div>
      
      {navItems.map((item) => {
        const isActive = location === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={() => isMobile && setMobileMenuOpen(false)}
          >
            <a
              className={cn(
                "flex items-center px-3 py-2 text-[#3a3a3c] hover:bg-[#f5f5f7] rounded-lg mb-1",
                isActive && "bg-[#f5f5f7]"
              )}
            >
              <Icon className="h-5 w-5 mr-3 text-[#8e8e93]" />
              <span>{item.label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-[#e5e5ea] p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-[#1d1d1f]">Gestor Docente</h1>
          <button className="text-[#8e8e93]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16">
          <NavList />
          <div className="p-4 border-t border-[#e5e5ea] absolute bottom-0 left-0 right-0">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#e5e5ea] hidden md:block">
        <div className="p-4 border-b border-[#e5e5ea]">
          <h1 className="text-xl font-semibold text-[#1d1d1f]">Gestor Docente</h1>
        </div>
        
        <NavList />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#e5e5ea]">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-[#d1d1d6] flex items-center justify-center text-white">
              {user?.fullName.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-[#3a3a3c]">{user?.fullName}</p>
              <p className="text-xs text-[#8e8e93]">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5ea] md:hidden z-10">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={cn(
                    "py-3 px-4 flex flex-col items-center",
                    isActive ? "text-[#0070f3]" : "text-[#8e8e93]"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs mt-1">{item.label.split(" ")[0]}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
