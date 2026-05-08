<template>
  <div class="columns is-multiline">
    <div class="column is-4 p-2">
      <div class="um-card um-card--glass um-card--soft">
        <div class="has-text-centered mb-4">
          <b-skeleton type="avatar" size="128px" :animated="true" class="mb-3" />
          <b-skeleton width="60%" :animated="true" class="mb-2" />
          <b-skeleton width="80%" :animated="true" class="mb-2" />
          <b-skeleton width="40%" :animated="true" class="mb-2" />
        </div>

        <div class="columns is-mobile is-centered user-stats mt-3">
          <div class="column has-text-centered">
            <b-skeleton width="70%" :animated="true" class="mb-1" />
            <b-skeleton width="50%" :animated="true" />
          </div>
          <div class="column has-text-centered">
            <b-skeleton width="70%" :animated="true" class="mb-1" />
            <b-skeleton width="50%" :animated="true" />
          </div>
        </div>

        <div class="section-seguridad mt-4">
          <b-skeleton width="80%" :animated="true" class="mb-2" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="50%" :animated="true" class="mt-2" />
        </div>
      </div>
    </div>

    <div class="column is-8">
      <div class="um-card um-card--glass um-card--soft">
        <b-skeleton width="30%" :animated="true" class="mb-3" />
        <b-skeleton width="100%" :animated="true" class="mb-2" />
        <b-skeleton width="100%" :animated="true" class="mb-2" />
        <b-skeleton width="100%" :animated="true" class="mb-2" />
        <b-skeleton width="60%" :animated="true" class="mb-2" />
        <b-skeleton width="100%" :animated="true" class="mb-2" />
        <b-skeleton width="40%" :animated="true" class="mt-3" />
      </div>
    </div>
  </div>
</template>

<script setup>
</script>
