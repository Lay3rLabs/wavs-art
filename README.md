# wavs-art

WAVS demo that uses Ollama and Stable Diffusion to generate AI-generated NFTs,
with a reward distribution system based on the NFTs minted.

## System requirements

<details>
<summary>Core (Docker, Compose, Make, JQ, Node v21+)</summary>

### Docker

- **MacOS**: `brew install --cask docker`
- **Linux**: `sudo apt -y install docker.io`
- **Windows WSL**: [docker desktop wsl](https://docs.docker.com/desktop/wsl/#turn-on-docker-desktop-wsl-2) & `sudo chmod 666 /var/run/docker.sock`
- [Docker Documentation](https://docs.docker.com/get-started/get-docker/)

### Docker Compose

- **MacOS**: Already installed with Docker installer
- **Linux + Windows WSL**: `sudo apt-get install docker-compose-v2`
- [Compose Documentation](https://docs.docker.com/compose/)

### Make

- **MacOS**: `brew install make`
- **Linux + Windows WSL**: `sudo apt -y install make`
- [Make Documentation](https://www.gnu.org/software/make/manual/make.html)

### JQ

- **MacOS**: `brew install jq`
- **Linux + Windows WSL**: `sudo apt -y install jq`
- [JQ Documentation](https://jqlang.org/download/)

### Node.js

- **Required Version**: v21+
- [Installation via NVM](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
</details>

<details>

<summary>Rust v1.84+</summary>

### Rust Installation

```bash docci-ignore
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

rustup toolchain install stable
rustup target add wasm32-wasip2
```

### Upgrade Rust

```bash docci-ignore
# Remove old targets if present
rustup target remove wasm32-wasi || true
rustup target remove wasm32-wasip1 || true

# Update and add required target
rustup update stable
rustup target add wasm32-wasip2
```

</details>

<details>
<summary>Cargo Components</summary>

### Install Cargo Components

```bash docci-ignore
# Install required cargo components
# https://github.com/bytecodealliance/cargo-component#installation
cargo install cargo-binstall
cargo binstall cargo-component warg-cli wkg --locked --no-confirm --force

# Configure default registry
# Found at: $HOME/.config/wasm-pkg/config.toml
wkg config --default-registry wa.dev
```

</details>

<details>
<summary>NVIDIA Container Toolkit</summary>

The [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) lets Docker use the GPU.

```bash
# install
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
&& curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add - \
&& curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# test
docker run --rm --gpus all nvidia/cuda:12.3.1-base-ubuntu20.04 nvidia-smi
```

</details>

## Usage

### Configure environment

```bash
# install dependencies
make setup

# copy the example env file
cp .env.example .env
```

Set the following environment variables in the `.env` file:

- `WAVS_ENV_PINATA_API_URL`
- `WAVS_ENV_PINATA_API_KEY`
- `IPFS_GATEWAY_URL`

These come from [https://pinata.cloud](pinata.cloud) and are used to upload NFT metadata to IPFS.

### Build contracts/services

```bash
make build
```

### Start WAVS and Anvil

```bash
# default: GPU
make start

# no GPU, use CPU instead (very slow)
DOCKER_COMPOSE_FILE=docker-compose.cpu.yml make start
```

### Deploy contracts/services

```bash
make deploy
```

### Mint NFT

```bash
PROMPT="mystical governance" make mint-nft
```

### Update NFT

```bash
PROMPT="natural governance" TOKEN_ID=0 make update-nft
```

### Show NFT

```bash
make show-nft
```

### Update Rewards

```bash
make update-rewards
```

### Claim Rewards

```bash
make claim-rewards
```

### Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
