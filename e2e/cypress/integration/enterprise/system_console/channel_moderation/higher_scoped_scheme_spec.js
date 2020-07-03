// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Group: @enterprise @system_console @channel_moderation

import {getRandomId} from '../../../../utils';

import {checkboxesTitleToIdMap} from './constants';

import {
    deleteOrEditTeamScheme,
    demoteToChannelOrTeamMember,
    disableChannelModeratedPermission,
    enableChannelModeratedPermission,
    enableDisableAllChannelModeratedPermissionsViaAPI,
    goToPermissionsAndCreateTeamOverrideScheme,
    goToSystemScheme,
    postChannelMentionsAndVerifySystemMessageNotExist,
    promoteToChannelOrTeamAdmin,
    saveConfigForChannel,
    saveConfigForScheme,
    viewManageChannelMembersModal,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';

describe('MM-23102 - Channel Moderation - Higher Scoped Scheme', () => {
    let regularUser;
    let guestUser;
    let testTeam;
    let testChannel;

    before(() => {
        // * Check if server has license
        cy.requireLicense();
    });

    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiResetRoles();
        cy.apiInitSetup().then(({team, channel, user}) => {
            regularUser = user;
            testTeam = team;
            testChannel = channel;

            cy.apiCreateGuestUser().then(({guest}) => {
                guestUser = guest;

                cy.apiAddUserToTeam(testTeam.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, guestUser.id);
                });
            });
        });
    });

    it('Effect of changing System Schemes on a Channel for which Channel Moderation Settings was modified', () => {
        // # Visit Channel page and Search for the channel.
        visitChannelConfigPage(testChannel);
        disableChannelModeratedPermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        disableChannelModeratedPermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);

        // # check the channel mentions option for guests and save
        enableChannelModeratedPermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();

        goToSystemScheme();
        cy.get('#all_users-public_channel-manage_public_channel_members').scrollIntoView().should('be.visible').click();
        cy.findByTestId('all_users-public_channel-manage_public_channel_members-checkbox').should('not.have.class', 'checked');
        saveConfigForScheme();

        // * Ensure manage members for members is disabled
        visitChannelConfigPage(testChannel);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

        visitChannel(regularUser, testChannel, testTeam);

        // # View members modal
        viewManageChannelMembersModal('View');

        // * Add Members button does not exist
        cy.get('#showInviteModal').should('not.exist');
    });

    it('Effect of changing System Schemes on a Channel for which Channel Moderation Settings was never modified', () => {
        // # Reset system scheme to default and create a new channel to ensure that this channels moderation settings have never been modified
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'never-modified', `Never Modified ${getRandomId()}`).then((response) => {
            const randomChannel = response.body;

            goToSystemScheme();
            cy.get('#all_users-public_channel-manage_public_channel_members').click();
            saveConfigForScheme();

            // # Visit Channel page and Search for the channel.
            // * ensure manage members for members is disabled
            visitChannelConfigPage(randomChannel);
            cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

            visitChannel(regularUser, randomChannel, testTeam);

            // # View members modal
            viewManageChannelMembersModal('View');

            // * Add Members button does not exist
            cy.get('#showInviteModal').should('not.exist');
        });
    });

    it('Effect of changing Team Override Schemes on a Channel for which Channel Moderation Settings was never modified', () => {
        // # Reset system scheme to default and create a new channel to ensure that this channels moderation settings have never been modified
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'never-modified', `Never Modified ${getRandomId()}`).then((response) => {
            const randomChannel = response.body;

            goToPermissionsAndCreateTeamOverrideScheme(randomChannel.name, testTeam);
            deleteOrEditTeamScheme(randomChannel.name, 'edit');
            cy.get('#all_users-public_channel-manage_public_channel_members').click();
            saveConfigForScheme(false);

            // # Visit Channel page and Search for the channel.
            // * Assert message for manage member for members appears and that it's disabled
            visitChannelConfigPage(randomChannel);
            cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
                should('have.text', `Manage members for members are disabled in ${randomChannel.name} Team Scheme.`);
            cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

            visitChannel(regularUser, randomChannel, testTeam);

            // # View members modal
            viewManageChannelMembersModal('View');

            // * Add Members button does not exist
            cy.get('#showInviteModal').should('not.exist');
        });
    });

    it('Effect of changing Team Override Schemes on a Channel for which Channel Moderation Settings was modified', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();

        // # Reset system scheme to default and create a new channel to ensure that this channels moderation settings have never been modified
        visitChannelConfigPage(testChannel);
        disableChannelModeratedPermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        disableChannelModeratedPermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();

        visitChannelConfigPage(testChannel);
        enableChannelModeratedPermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();

        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.get('#all_users-public_channel-manage_public_channel_members').click();
        saveConfigForScheme(false);

        // # Visit Channel page and Search for the channel.
        // * Assert message shows and manage members for members is disabled
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

        visitChannel(regularUser, testChannel, testTeam);

        // # View members modal
        viewManageChannelMembersModal('View');

        // * Add Members button does not exist
        cy.get('#showInviteModal').should('not.exist');
    });

    it('Manage Members removed for Public Channels', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();

        // # Create a new team override scheme and remove manage public channel members
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.get('#all_users-public_channel-manage_public_channel_members').click();

        // * Ensure that manage private channel members is checked
        cy.get('#all_users-private_channel-manage_private_channel_members').children().should('have.class', 'checked');
        saveConfigForScheme(false);

        // # Visit Channel page and Search for the channel.
        // * Ensure message is disabled and manage members for members is disabled
        visitChannelConfigPage(testChannel);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

        // # Turn channel into a private channel
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);

        // * Ensure it is private and no error message is shown and that manage members for members is not disabled
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('not.be.disabled');

        // # Turn channel back to public channel
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);

        // * ensure it got reverted back to a Public channel
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
    });

    it('Manage Members removed for Private Channels / Permissions inherited when channel converted from Public to Private', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();

        // # Create a new team override scheme and remove manage private channel members from it
        // * Ensure that manage public channel members is checked
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.get('#all_users-private_channel-manage_private_channel_members').click();
        cy.get('#all_users-public_channel-manage_public_channel_members').children().should('have.class', 'checked');
        saveConfigForScheme(false);

        // # Visit Channel page and Search for the channel.
        visitChannelConfigPage(testChannel);

        // * Ensure that error message is not displayed and manage members for members is not disabled
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('not.be.disabled');

        // # Turn it into a private channel
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);

        // * Ensure it is a private channel and that a message is disabled and also manage members for members is disabled
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');

        // # Turn channel back to public channel
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);

        // * Ensure it got reset back to a public channel
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
    });

    it('Check if user is allowed to Edit or Delete their own posts on a Read-Only channel', () => {
        visitChannel(regularUser, testChannel, testTeam);
        cy.postMessage(`test message ${Date.now()}`);
        cy.findByTestId('post_textbox_placeholder').should('not.have.text', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('not.be.disabled');

        visitChannelConfigPage(testChannel);
        disableChannelModeratedPermission(checkboxesTitleToIdMap.CREATE_POSTS_MEMBERS);

        saveConfigForChannel();

        visitChannel(regularUser, testChannel, testTeam);

        // * user should see a message stating that this channel is read-only and the textbox area should be disabled
        cy.findByTestId('post_textbox_placeholder').should('have.text', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('be.disabled');

        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);

            // * As per test case, ensure edit and delete button show up
            cy.get(`#edit_post_${postId}`).should('exist');
            cy.get(`#delete_post_${postId}`).should('exist');
        });
    });

    it('Channel Moderation Settings should not be applied for Channel Admins', () => {
        enableDisableAllChannelModeratedPermissionsViaAPI(testChannel, false);
        visitChannel(regularUser, testChannel, testTeam);
        promoteToChannelOrTeamAdmin(regularUser.id, testChannel.id);

        // * Assert user can post message and user channel mentions
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);

        // # Check Channel Admin have the permission to react to any post on a channel when all channel moderation permissions are off.
        // * Channel Admin should see the smiley face that allows a user to react to a post
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });

        // # View members modal
        viewManageChannelMembersModal('Manage');

        // * Add Members button does not exist
        cy.get('#showInviteModal').should('exist');

        demoteToChannelOrTeamMember(regularUser.id, testChannel.id);
    });

    it('Channel Moderation Settings should not be applied for Team Admins', () => {
        enableDisableAllChannelModeratedPermissionsViaAPI(testChannel, false);
        visitChannel(regularUser, testChannel, testTeam);
        promoteToChannelOrTeamAdmin(regularUser.id, testTeam.id, 'teams');

        // * Assert user can post message and user channel mentions
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);

        // # Check Channel Admin have the permission to react to any post on a channel when all channel moderation permissions are off.
        // * Channel Admin should see the smiley face that allows a user to react to a post
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });

        // # View members modal
        viewManageChannelMembersModal('Manage');

        // * Add Members button does not exist
        cy.get('#showInviteModal').should('exist');

        demoteToChannelOrTeamMember(regularUser.id, testTeam.id, 'teams');
    });
});
