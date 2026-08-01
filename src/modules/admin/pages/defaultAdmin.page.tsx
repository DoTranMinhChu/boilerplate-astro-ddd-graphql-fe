import { useRoutes } from "@/shared/contexts/routes/RoutesContext";

export function DefaultAdminPage() {
  const { navigateToPage } = useRoutes();

  navigateToPage('adminDashboard.users');

  return <>Hello</>;
}
