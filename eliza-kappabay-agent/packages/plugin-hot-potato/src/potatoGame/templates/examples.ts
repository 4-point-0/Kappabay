export const potatoGameStatusCheckExample = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Check the Hot Potato game status for my address.",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the Hot Potato game status for your address.",
                action: "CHECK_HOT_POTATO_GAME_STATUS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Explaining game rules and invites user to create a game cap for a hot potato game in SUI blockchain",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What is the Hot Potato game status for my address.",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the Hot Potato game status for your address.",
                action: "CHECK_HOT_POTATO_GAME_STATUS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "You already have a game cap object. you can start a hot potato game by baking a hot potato in the bakery",
            },
        },
    ],
];

export const bakeAndSendModalCapExample = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Create and send a Modal Cap to me.",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll create and send a Modal Cap to your address.",
                action: "CREATE_AND_SEND_MODAL_CAP",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I created and sent a Modal Cap to your address.",
            },
        },
    ],
];
export const checkUniquePlayerCountExample = [
    [
        {
            user: "{{user1}}",
            content: "Check how many unique players are in the game",
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the unique player count for your game.",
                action: "CHECK_UNIQUE_PLAYER_COUNT",
            },
        },
    ],
];

export const checkGameTransferCountExample = [
    [
        {
            user: "{{user1}}",
            content: "Check how many total transfer are in the game.",
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the total transfers count for your game.",
                action: "CHECK_GAME_TRANSFER_COUNT",
            },
        },
    ],
];
