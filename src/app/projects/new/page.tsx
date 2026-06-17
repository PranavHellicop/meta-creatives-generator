import { AppHeader } from "@/components/AppHeader";
import { ProjectForm } from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <>
      <AppHeader />
      <ProjectForm mode="create" />
    </>
  );
}
