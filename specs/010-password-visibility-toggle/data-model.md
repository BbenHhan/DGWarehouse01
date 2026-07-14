# Data Model: Password Visibility Toggle

No entities, no schema, no persisted state. The only state introduced is a component-local `visible: boolean` inside the new `PasswordInput` component, which never leaves the browser and is not read by any other part of the app.
