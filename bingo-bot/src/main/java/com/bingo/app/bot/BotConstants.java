package com.bingo.app.bot;

import java.util.Map;

public class BotConstants {

    // Menu button labels (shown on the persistent reply keyboard)
    public static final String BTN_CHECK_BALANCE = "\uD83D\uDCB0 Check Balance";
    public static final String BTN_ACTIVE_GAME = "\uD83C\uDFAE Active Game";
    public static final String BTN_INVITE_LINK = "\uD83D\uDD17 Invite Link";
    public static final String BTN_CREATE_ADMIN = "\uD83D\uDE80 Create Admin";

    // Admin Actions
    public static final String INVITE_LINK = "INVITE_LINK";

    // Super Admin Actions
    public static final String CREATE_ADMIN = "CREATE_ADMIN";

    // Player Actions
    public static final String CHECK_BALANCE = "CHECK_BALANCE";
    public static final String ACTIVE_GAME = "ACTIVE_GAME";

    // Maps a reply-keyboard button label (which arrives as a text message
    // when pressed) to the callback action that handles it.
    public static final Map<String, String> BUTTON_ACTIONS = Map.of(
            BTN_CHECK_BALANCE, CHECK_BALANCE,
            BTN_ACTIVE_GAME, ACTIVE_GAME,
            BTN_INVITE_LINK, INVITE_LINK,
            BTN_CREATE_ADMIN, CREATE_ADMIN
    );
}