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

# Bake every crate file in, so an image without the server has them too. The toolchains
# and the cargo registry are removed in the same layer, so they neither grow the image nor
# show up as Rust at start; `yarn start` finds both kinds of crates current by their keys
# and skips. The supported crates use the toolchain the wasm packages build with.
RUN export CARGO_HOME=/opt/crates/cargo RUSTUP_HOME=/opt/crates/rustup \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --no-modify-path --default-toolchain none --profile minimal \
    && export PATH="$CARGO_HOME/bin:$PATH" \
    && node scripts/generate-default-crates.mjs \
    && toolchain=$(awk '/channel/{gsub(/"/, ""); print $3 }' ../wasm/rust-toolchain.toml) \
    && rustup toolchain install "$toolchain" --profile minimal \
    && RUSTUP_TOOLCHAIN="$toolchain" node scripts/generate-crates.mjs \
    && rm -rf /opt/crates

# Start client
EXPOSE 3000
CMD ["yarn", "start"]
