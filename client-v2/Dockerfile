# Conditionally copy based on whether the server image has been built before
ARG HAS_SERVER
# Default non-root user
ARG USER
# Base image; the tag matches .nvmrc
ARG IMAGE="node:22.20.0"

################################## Has server ##################################
FROM ${IMAGE} AS server-true

ARG USER

# Install Rust
ONBUILD RUN sh -c "$(curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs)" -- -y
ONBUILD ENV PATH="/root/.cargo/bin:$PATH"

# Copy the built crate infos from the server image
ONBUILD COPY --from=solana-playground-server /home/${USER}/.cargo /root/.cargo

################################### No server ##################################
FROM ${IMAGE} AS server-false

# Set build server URL to the fork's production API
ONBUILD ENV REACT_APP_SERVER_URL="https://playground-server-dot-analytics-324114.de.r.appspot.com"

###################### Build and start development client ######################
FROM server-${HAS_SERVER}

ARG USER

WORKDIR /home/${USER}
COPY . .

# The WASM image has to be built before, which is handled by the compose file
COPY --from=solana-playground-wasm /wasm wasm

# Only client/public: client-v2 has no submodule of its own, it mirrors this one
RUN git submodule update --init client/public

# Install dependencies
WORKDIR /home/${USER}/client-v2
RUN yarn install --frozen-lockfile

# Bake the assets in, so the container does not need the network to start.
# `yarn start`/`yarn build` re-run this and it is idempotent.
RUN node scripts/update-static.mjs

# Bake the default crates in. Their toolchain is removed in the same layer, so it neither
# grows the image nor shows up as Rust to `generate-crates`; `yarn start` finds the crates
# current by their key and skips.
RUN export CARGO_HOME=/opt/default-crates/cargo RUSTUP_HOME=/opt/default-crates/rustup \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --no-modify-path --default-toolchain none --profile minimal \
    && PATH="$CARGO_HOME/bin:$PATH" node scripts/generate-default-crates.mjs \
    && rm -rf /opt/default-crates

# Start client
EXPOSE 3000
CMD ["yarn", "start"]
