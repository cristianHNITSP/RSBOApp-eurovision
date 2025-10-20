<template>
    <nav class="navbar is-primary is-fixed-top" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <a class="navbar-item py-1" href="#">
                <span class="icon is-small">
                    <i class="fas fa-eye"></i>
                </span>
                <span class="ml-2 has-text-weight-medium is-size-6">RSBO</span>
            </a>

            <a role="button" class="navbar-burger" :class="{ 'is-active': isActive }" aria-label="menu"
                aria-expanded="false" @click="toggleBurger">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>


        </div>

        <div class="navbar-menu" :class="{ 'is-active': isActive }">
            <div class="navbar-end is-align-items-center">
                <b-dropdown position="is-bottom-left" class="navbar-item" :active.sync="dropdownLoginActive"
                    :can-close="['outside']">
                    <template #trigger>
                        <a role="button" class="navbar-link">
                            <span>Login</span>
                        </a>
                    </template>

                    <b-dropdown-item custom paddingless>
                        <form @submit.prevent="onLogin" autocomplete="on">
                            <div class="modal-card px-3 py-2" style="width: 300px">
                                <section class="modal-card-body py-2">
                                    <b-field label="Email" size="is-small">
                                        <b-input type="email" name="email" autocomplete="email" v-model="loginEmail"
                                            placeholder="Your email" required />
                                    </b-field>

                                    <b-field label="Password" size="is-small">
                                        <b-input type="password" name="password" autocomplete="current-password"
                                            password-reveal v-model="loginPassword" placeholder="Your password"
                                            required />
                                    </b-field>

                                    <b-checkbox v-model="loginRemember" size="is-small">
                                        Remember me
                                    </b-checkbox>
                                </section>

                                <footer class="modal-card-foot py-3 is-flex is-justify-content-flex-start">
                                    <b-button type="is-primary" native-type="submit" size="is-small">Login</b-button>
                                </footer>
                            </div>
                        </form>
                    </b-dropdown-item>
                </b-dropdown>
            </div>
        </div>
    </nav>
</template>

<script>
export default {
    name: "Navbar",
    data() {
        return {
            isActive: false,
            dropdownLoginActive: false,
            loginEmail: "",
            loginPassword: "",
            loginRemember: false,
        };
    },
    methods: {
        toggleBurger() {
            this.isActive = !this.isActive;
        },
        onLogin() {
            alert(`Email: ${this.loginEmail}\nPassword: ${this.loginPassword}`);
            this.dropdownLoginActive = false;
        },
    },
};
</script>
