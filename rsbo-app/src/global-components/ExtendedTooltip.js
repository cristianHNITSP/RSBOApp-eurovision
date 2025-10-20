// src/global-components/ExtendedTooltip.js
import { BTooltip } from 'buefy'  // o donde venga BTooltip

export default {
  extends: BTooltip,
  emits: ['click'],
  mounted() {
    const trigger = this.$el.querySelector('[aria-describedby]') || this.$el
    if (trigger) {
      trigger.addEventListener('click', this.handleClick)
    }
  },
  beforeUnmount() {
    const trigger = this.$el.querySelector('[aria-describedby]') || this.$el
    if (trigger) {
      trigger.removeEventListener('click', this.handleClick)
    }
  },
  methods: {
    handleClick(event) {
      this.isActive = false
      this.$emit('click', event)
    }
  }
}
