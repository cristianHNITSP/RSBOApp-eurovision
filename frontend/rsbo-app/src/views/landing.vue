<template>
    <div>
        <Navbar />

        <div class="landing-panel is-flex is-flex-direction-column">
            <div class="background-animated mt-6" ref="floatingContainer" style="flex-grow: 1;">
                <!-- Sección Hero -->
                <section class="hero animate-fade-up" :style="heroStyle">
                    <div class="hero-body is-flex is-justify-content-center is-align-items-center">
                        <div class="box has-text-centered p-6" :style="boxStyle">
                            <figure class="mb-4 logo-float" style="width: 200px;">
                                <img :src="logoImg" alt="Logo" style="width: 100%;" />
                            </figure>
                            <h1 class="title is-3 has-text-primary">Bienvenido a Laboratorio Eurovisión</h1>
                            <p class="subtitle is-5 has-text-grey-dark mt-3">
                                Una plataforma avanzada para gestión de pedidos ópticos.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Sección Features -->
                <section class="section features-section">
                    <div class="container">
                        <div class="columns is-multiline is-variable is-6 is-centered">
                            <div v-for="(feature, index) in features" :key="index"
                                class="column is-12-mobile is-6-tablet is-4-desktop animate-fade-up mb-6 is-flex is-flex-direction-column">
                                <div
                                    class="box has-text-centered p-5 is-flex is-flex-direction-column is-align-items-center is-flex-grow-1">
                                    <b-icon :icon="feature.icon" pack="far" size="is-large"
                                        class="has-text-primary mb-4" />
                                    <h3 class="title is-5 mb-2">{{ feature.title }}</h3>
                                    <p class="subtitle is-6 has-text-grey mt-2">{{ feature.description }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            <section class="section has-background-light animate-fade-up step-section">
                <div class="container">
                    <h2 class="title has-text-centered is-4 mb-6">¿Cómo funciona?</h2>
                    <b-steps type="is-primary" label-position="bottom" size="is-medium" :has-navigation="false"
                        :animated="true">
                        <b-step-item v-for="(step, i) in steps" :key="i" :label="step.title" class="animate-fade-up">
                            <p class="has-text-centered mt-4">{{ step.description }}</p>
                        </b-step-item>
                    </b-steps>
                </div>
            </section>

            <footer class="footer has-background-gradient">
                <div class="content has-text-centered">
                    <p class="mb-3">
                        <strong class="has-text-light">Laboratorio Eurovisión</strong> © {{ new Date().getFullYear() }}
                        –
                        Todos los derechos reservados.
                    </p>
                    <div class="social-icons is-flex is-justify-content-center is-align-items-center">
                        <a href="#" aria-label="Facebook" class="icon is-large mx-3 social-link">
                            <b-icon pack="fab" icon="facebook-f" size="is-medium" />
                        </a>
                        <a href="#" aria-label="Twitter" class="icon is-large mx-3 social-link">
                            <b-icon pack="fab" icon="twitter" size="is-medium" />
                        </a>
                        <a href="#" aria-label="Instagram" class="icon is-large mx-3 social-link">
                            <b-icon pack="fab" icon="instagram" size="is-medium" />
                        </a>
                        <a href="#" aria-label="LinkedIn" class="icon is-large mx-3 social-link">
                            <b-icon pack="fab" icon="linkedin-in" size="is-medium" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>

    </div>
</template>

<script setup>
import { useIntersectionObserver } from '../composables/useIntersectionObserver'
import Navbar from '../components/Navbar.vue'
import logoImg from '../assets/img/logo-euro.png'

useIntersectionObserver('.animate-fade-up')

const heroStyle = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '40vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

const boxStyle = {
    maxWidth: '700px',
    width: '100%',
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.85)',
    borderRadius: '0.75rem',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
}

const features = [
    { icon: 'check-circle', title: 'Pedidos precisos', description: 'Control total sobre los pedidos ópticos.' },
    { icon: 'clock', title: 'Eficiencia', description: 'Procesos rápidos y automáticos.' },
    { icon: 'chart-bar', title: 'Estadísticas', description: 'Visualización en tiempo real del rendimiento.' },
]

const steps = [
    { title: 'Paso 1', description: 'Solicita tu cuenta con laboratorio eurovisión.' },
    { title: 'Paso 2', description: 'Agrega tus productos y comienza a recibir pedidos.' },
    { title: 'Paso 3', description: 'Consulta estadísticas y mantén el control.' },
]
</script>

<script>
export default {
    data() {
        return {
            maxIcons: 15,
            icons: [],
            cycleInterval: null,
            iconTypes: [
                { icon: 'glasses', size: 'fa-3x' },
                { icon: 'eye', size: 'fa-3x' },
            ],
            animations: [
                { name: 'floatUpDown', duration: 1 },
                { name: 'floatLeftRight', duration: 0.9 },
                { name: 'floatRotate', duration: 1.2 },
            ],
            minDistance: 12,
            nextId: 0,  // Contador para el id cíclico
        };
    },
    methods: {
        createIconElement(id) {
            // Crea un <i> nuevo con las clases y estilos base
            const iconType = this.iconTypes[id % this.iconTypes.length];
            const animation = this.animations[id % this.animations.length];

            const el = document.createElement('i');
            el.classList.add('fas', `fa-${iconType.icon}`, 'floating-icon', iconType.size);
            el.style.position = 'absolute';
            el.style.animationName = animation.name;
            el.style.animationDuration = `${animation.duration}s`;
            el.style.animationTimingFunction = 'ease-in-out';
            el.style.animationIterationCount = 'infinite';
            el.style.animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
            el.style.opacity = 0;
            el.style.color = '#6366f1';
            el.style.pointerEvents = 'none';
            el.style.userSelect = 'none';

            return el;
        },
        setPosition(el) {
            // Posiciona el icono asegurando no se superponga
            let top, left, attempts = 0;
            do {
                top = Math.random() * 80 + 10;
                left = Math.random() * 80 + 10;
                attempts++;
            } while (!this.isPositionValid(top, left, el) && attempts < 50);

            el.style.top = `${top}%`;
            el.style.left = `${left}%`;
            el.dataset.top = top;
            el.dataset.left = left;
        },
        isPositionValid(top, left, currentEl) {
            for (const icon of this.icons) {
                if (icon === currentEl) continue;  // Ignora el mismo elemento al comparar
                const t = parseFloat(icon.dataset.top);
                const l = parseFloat(icon.dataset.left);
                const dist = Math.sqrt((t - top) ** 2 + (l - left) ** 2);
                if (dist < this.minDistance) return false;
            }
            return true;
        },
        initIcons() {
            const container = this.$refs.floatingContainer;
            if (!container) return;

            for (let i = 0; i < this.maxIcons; i++) {
                const el = this.createIconElement(i);
                this.setPosition(el);
                container.appendChild(el);
                this.icons.push(el);

                // Aparece con fade-in
                setTimeout(() => {
                    el.style.transition = 'opacity 1s ease-in-out';
                    el.style.opacity = 0.12;
                }, 50);
            }
            this.nextId = this.maxIcons;
        },
        cycleIcons() {
            const container = this.$refs.floatingContainer;
            if (!container) return;

            // Reusar el primer icono para el siguiente ciclo
            const icon = this.icons.shift();
            if (!icon) return;

            // Hacer fade-out
            icon.style.transition = 'opacity 0.8s ease-in-out';
            icon.style.opacity = 0;

            setTimeout(() => {
                this.setPosition(icon);
                icon.style.animationName = this.animations[this.nextId % this.animations.length].name;
                icon.style.animationDuration = `${this.animations[this.nextId % this.animations.length].duration}s`;
                icon.style.animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';

                icon.style.transition = 'opacity 1s ease-in-out';
                icon.style.opacity = 0.12;

                this.icons.push(icon);
            }, 800);

            this.nextId = (this.nextId + 1) % 1000000; // Evitar overflow infinito
        }
    },
    mounted() {
        this.initIcons();
        this.cycleInterval = setInterval(this.cycleIcons, 1500);
    },
    beforeDestroy() {
        if (this.cycleInterval) clearInterval(this.cycleInterval);
    }
}

</script>

<style>
/* Animación general */
/* Animación controlada con clase visible (tus originales) */
.animate-fade-up {
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s ease;
}

.animate-fade-up.visible {
    opacity: 1;
    transform: translateY(0);
}

/* Animación con keyframes para carga única (uso alternativo) */
@keyframes fadeUpLoad {
    0% {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Clase alternativa para animación con keyframes (no choca con .animate-fade-up) */
.animate-fade-up-anim {
    animation: fadeUpLoad 0.8s ease forwards;
}

/* Hero box con sombra, hover y transición */
.hero .box {
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.9);
}

.hero .box:hover {
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.2);
    transform: translateY(-5px);
}

/* Features cards estilos */
.features-section .box {
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    border-radius: 0.75rem;
    background: #fff;
    cursor: pointer;
    will-change: transform;
}

.features-section .box:hover {
    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    /* azul violeta */
    transform: translateY(-8px) scale(1.05);
}

/* Iconos con efecto color y transición */
.features-section b-icon {
    transition: color 0.3s ease;
}

.features-section .box:hover b-icon {
    color: #6366f1;
    /* azul violeta vivo */
}

/* Delay animación en features con cascada usando la clase con keyframes */
.features-section .column {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
    animation: fadeUpLoad 0.7s ease forwards;
}

.features-section .column:nth-child(1) {
    animation-delay: 0.15s;
}

.features-section .column:nth-child(2) {
    animation-delay: 0.3s;
}

.features-section .column:nth-child(3) {
    animation-delay: 0.45s;
}

.features-section .column:nth-child(4) {
    animation-delay: 0.6s;
}

.features-section .column:nth-child(5) {
    animation-delay: 0.75s;
}

.features-section .column:nth-child(6) {
    animation-delay: 0.9s;
}
</style>

<style>
.has-background-gradient {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
}

.footer .content p {
    font-size: 1rem;
}

.social-icons .social-link {
    cursor: pointer;

    color: #d1d5db;
    /* gris claro */
    transition: color 0.3s ease;
}

.social-icons .social-link:hover {
    color: #c7d2fe;
    /* azul claro suave */
    transform: scale(1.1);
}
</style>

<style>
@keyframes swing {
    0% {
        transform: rotate(0deg);
    }

    25% {
        transform: rotate(5deg);
    }

    50% {
        transform: rotate(0deg);
    }

    75% {
        transform: rotate(-5deg);
    }

    100% {
        transform: rotate(0deg);
    }
}

.logo-float img {
    animation: swing 3s ease-in-out infinite;
    transform-origin: 50% 90%;
    /* pivote en la base */
}
</style>

<style scoped>
.floating-icon {
    color: #6366f1;
    user-select: none;
    pointer-events: none;
    position: absolute;
    opacity: 0.12;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    transition: opacity 1s ease-in-out;
}

@keyframes floatUpDown {

    0%,
    100% {
        transform: translateY(0) rotate(0deg);
    }

    50% {
        transform: translateY(-30px) rotate(10deg);
    }
}

@keyframes floatLeftRight {

    0%,
    100% {
        transform: translateX(0) rotate(0deg);
    }

    50% {
        transform: translateX(80px) rotate(-10deg);
    }

    /* movimiento más amplio */
}

@keyframes floatRotate {

    0%,
    100% {
        transform: rotate(0deg) translateY(0);
    }

    50% {
        transform: rotate(360deg) translateY(-15px);
    }
}
</style>

<style scoped>
.landing-panel {
    height: 100vh;
    /* ocupar toda la altura visible */
    overflow-y: auto;
    /* scroll vertical solo aquí */
}
</style>