#!/bin/bash

echo "🤖 Oracle Callback Demo"

# Set the ESCAPED_JSON variable (from your working environment variable)
ESCAPED_JSON='[{\"package\":\"0xbaa156cd43dbeb4997803f9920443b8dbabdd6bac7c59c6a1261e6749f4a7651\",\"module\":\"callback_example\",\"function\":\"create_nft\",\"requires_user_wallet\":false,\"arguments\":[{\"type\":\"string\",\"value\":\"Cool NFT\"},{\"type\":\"string\",\"value\":\"This NFT was created via a callback\"}],\"type_arguments\":[]},{\"package\":\"0xbaa156cd43dbeb4997803f9920443b8dbabdd6bac7c59c6a1261e6749f4a7651\",\"module\":\"callback_example\",\"function\":\"transfer_sui\",\"requires_user_wallet\":false,\"arguments\":[{\"type\":\"address\",\"value\":\"0x4c775930e974767a7f8ab831af3da5f7bf8b4cf1e780d6f2eea3b152391fa478\"},{\"type\":\"u64\",\"value\":1000000}],\"type_arguments\":[]}]'

echo "📤 Sending callback inference..."

# Run the callback inference command using the working double-quote format
sui client call \
  --package 0x6aca68dac30da22f3c3fd5550fcbc4f99ea9d246b46298d2c937d5969b5bac0e \
  --module prompt_manager \
  --function infer_prompt_with_callbacks \
  --args \
    "0x5232f9962d081cfbea8932e534b76b3f7e3a77f118084a9c85ed17b3c51fdb33" \
    "0x5587dd56ee1854cd74fd8c99de034647f09503ea0842fb09d978346088384fa9" \
    "Create an NFT and transfer some SUI to me" \
    "0x4c775930e974767a7f8ab831af3da5f7bf8b4cf1e780d6f2eea3b152391fa478" \
    "\"$ESCAPED_JSON\"" \
  --gas-budget 100000000

echo "✅ Done! Check oracle logs and your wallet for the NFT and SUI transfer."