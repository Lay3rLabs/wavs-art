# wavs-art

Demo that uses WAVS, Ollama, and Stable Diffusion to generate AI-generated NFTs, and an associated reward distribution based on the NFTs minted.

## Usage

### Start WAVS and Anvil

```bash
# copy the example env file
cp .env.example .env

# Create new operator
cast wallet new-mnemonic --json > .docker/operator1.json
export OPERATOR_MNEMONIC=`cat .docker/operator1.json | jq -r .mnemonic`
export OPERATOR_PK=`cat .docker/operator1.json | jq -r '.accounts[0].private_key'`

# start the services
make start-all
```

### Deploy contracts and service

```bash
./script/deploy.sh
```

### Start the frontend

```bash
cd frontend
npm install
npm run dev
```
