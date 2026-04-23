<template>
  <!-- Nielsen H8: clean, minimal global wrapper -->
  <div class="min-h-screen bg-slate-50 text-slate-900 antialiased">
    <AppHeader />
    <main id="main-content" tabindex="-1" class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <NuxtPage />
    </main>
    <FeedbackWidget />
  </div>
</template>
