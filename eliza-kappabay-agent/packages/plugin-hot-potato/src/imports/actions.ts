import { checkGameTransferCount } from "../potatoGame/actions/checkGameTransferCount.ts";
import { checkUniquePlayerCount } from "../potatoGame/actions/checkUniquePlayerCount.ts";
import { createAndSendModalCap } from "../potatoGame/actions/createAndSendModalCap.ts";
import { potatoGameStatusCheck } from "../potatoGame/actions/potatoGameStatusCheck.ts";

export default [
    potatoGameStatusCheck,
    createAndSendModalCap,
    checkUniquePlayerCount,
    checkGameTransferCount,
];
