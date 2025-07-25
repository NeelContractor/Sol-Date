#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("yeyAtDe631iSoW5CYpb7tiGjiAtmNGk8eWnw4R2ZbU7");

#[program]
pub mod soldate {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, name: String, age: u8, bio: String, interests: Vec<String>, location: String) -> Result<()> {
        let profile = &mut ctx.accounts.profile;

        require!(name.len() <= 32, SolDateError::NameTooLong);
        require!(bio.len() <= 100, SolDateError::BioTooLong);
        require!(age >= 18, SolDateError::AgeTooYoung);

        profile.owner = ctx.accounts.user.key();
        profile.name = name;
        profile.age = age;
        profile.bio = bio;
        profile.interests = interests;
        profile.location = location;
        profile.is_active = true;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.matches = Vec::new();
        profile.bump = ctx.bumps.profile;

        Ok(())
    }

    pub fn update_profile(ctx: Context<UpdateProfile>, name: Option<String>, age: Option<u8>, bio: Option<String>, interests: Option<Vec<String>>, location: Option<String>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;

        if let Some(new_name) = name {
            require!(new_name.len() <= 32, SolDateError::NameTooLong);
            profile.name = new_name;
        }

        if let Some(new_bio) = bio {
            require!(new_bio.len() <= 100, SolDateError::BioTooLong);
            profile.bio = new_bio;
        }
        
        if let Some(new_age) = age {
            require!(new_age >= 18, SolDateError::AgeTooYoung);
            profile.age = new_age;
        }

        if let Some(new_interests) = interests {
            profile.interests = new_interests;
        }

        if let Some(new_location) = location {
            profile.location = new_location;
        }

        Ok(())
    }

    pub fn send_like(ctx: Context<SendLike>, timestamp: i64, target_user: Pubkey) -> Result<()> {
        let like = &mut ctx.accounts.like;

        like.sender = ctx.accounts.sender.key();
        like.receiver = target_user;
        like.timestamp = timestamp;
        like.is_match = false;
        like.bump = ctx.bumps.like;
        Ok(())
    }

    pub fn create_match(ctx: Context<CreateMatch>, user1: Pubkey, user2: Pubkey) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;

        match_account.user1 = user1;
        match_account.user2 = user2;
        match_account.created_at = Clock::get()?.unix_timestamp;
        match_account.is_active = true;
        match_account.messages = Vec::new();
        match_account.bump = ctx.bumps.match_account;
        Ok(())
    }

    pub fn send_message(ctx: Context<SendMessage>, content: String) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        
        require!(content.len() <= 200, SolDateError::MessageTooLong);
        require!(match_account.is_active, SolDateError::MatchNotActive);

        let message = Message {
            sender: ctx.accounts.sender.key(),
            content,
            timestamp: Clock::get()?.unix_timestamp
        };
        match_account.messages.push(message);
        Ok(())
    }

    pub fn block_user(ctx: Context<Blocked>, blocked_user: Pubkey) -> Result<()> {
        let block = &mut ctx.accounts.block;

        block.blocker = ctx.accounts.blocker.key();
        block.blocked = blocked_user;
        block.timestamp = Clock::get()?.unix_timestamp;
        block.bump = ctx.bumps.block;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        // has_one = owner @ SolDateError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(timestamp: i64)]
pub struct SendLike<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = 8 + Like::INIT_SPACE,
        seeds = [b"like", sender.key().as_ref(), timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub like: Account<'info, Like>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user1: Pubkey, user2: Pubkey)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Match::INIT_SPACE,
        seeds = [b"match", user1.as_ref(), user2.as_ref()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        seeds = [b"match", match_account.user1.as_ref(), match_account.user2.as_ref()],
        bump = match_account.bump
    )]
    pub match_account: Account<'info, Match>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(blocked_user: Pubkey)]
pub struct Blocked<'info> {
    #[account(mut)]
    pub blocker: Signer<'info>,
    #[account(
        init,
        payer = blocker,
        space = 8 + BlockedUser::INIT_SPACE,
        seeds = [b"block", blocker.key().as_ref(), blocked_user.as_ref()],
        bump
    )]
    pub block: Account<'info, BlockedUser>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub owner: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub age: u8,
    #[max_len(100)]
    pub bio: String,
    #[max_len(5, 16)]
    pub interests: Vec<String>,
    #[max_len(32)]
    pub location: String,
    pub is_active: bool,
    pub created_at: i64,
    #[max_len(64)]
    pub matches: Vec<Pubkey>,
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct Like {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub timestamp: i64,
    pub is_match: bool,
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct Match {
    pub user1: Pubkey,
    pub user2: Pubkey,
    pub created_at: i64,
    pub is_active: bool,
    #[max_len(64)]
    pub messages: Vec<Message>,
    pub bump: u8
}

// Probably won't use Message struct/ might just use db for this
// #[account]
// #[derive(InitSpace)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Message {
    pub sender: Pubkey,
    #[max_len(200)]
    pub content: String,
    pub timestamp: i64,
}

// Probably won't use Blockeduser struct/ might just use db for this
#[account]
#[derive(InitSpace)]
pub struct BlockedUser {
    pub blocker: Pubkey,
    pub blocked: Pubkey,
    pub timestamp: i64,
    pub bump: u8
}

#[error_code]
pub enum SolDateError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("User must be at least 18 years old")]
    AgeTooYoung,
    #[msg("Bio is too long")]
    BioTooLong,
    #[msg("Message is too long")]
    MessageTooLong,
    #[msg("Match not active")]
    MatchNotActive,

}