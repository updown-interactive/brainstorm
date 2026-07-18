<script lang="ts">
  import { onMount } from 'svelte';
  import { onboardingController } from './controller';
  import "./splash.css";

  onMount(() => {
    // Add a slight delay for the splash screen so the user can see the logo
    setTimeout(() => {
      onboardingController.load();
    }, 1500);
  });
</script>

<div class="splash-container">
  <div class="logo-wrapper">
    <div class="logo" role="img" aria-label="Brain Storm Logo"></div>
  </div>
  <div class="title-wrapper">
    <h1 class="title">Brain Storm</h1>
  </div>
</div>
