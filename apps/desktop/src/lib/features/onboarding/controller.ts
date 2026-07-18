import { goto } from '$app/navigation';
import { ROUTES } from '../../app/routes';
import { projectService } from '../../core/service/projectsService';

class OnboardingController {
  async load() {
    try {
      const projects = await projectService.getProjects();
      if (projects && projects.length > 0) {
        await goto(ROUTES.SHELL);
      } else {
        await goto(ROUTES.ONBOARDING);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      await goto(ROUTES.ONBOARDING);
    }
  }
}

export const onboardingController = new OnboardingController();