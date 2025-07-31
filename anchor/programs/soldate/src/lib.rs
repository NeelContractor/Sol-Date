#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("GYR5dzGaxxccGV9Nd6RZy3jb8CktP9LC1fpWgwFUWhPR");

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

    pub fn send_like(ctx: Context<SendLike>, target_user: Pubkey) -> Result<()> {
        let like = &mut ctx.accounts.like;
        let sender_profile = &mut ctx.accounts.sender_profile;
        let target_profile = &mut ctx.accounts.target_profile;

        require!(sender_profile.is_active, SolDateError::UserNotActive);
        require!(target_profile.is_active, SolDateError::UserNotActive);
        require!(ctx.accounts.sender.key() != target_user, SolDateError::CannotLikeSelf);

        let timestamp = Clock::get()?.unix_timestamp;
        let sender_key = ctx.accounts.sender.key();

        like.sender = sender_key;
        like.receiver = target_user;
        like.timestamp = timestamp;
        like.bump = ctx.bumps.like;

        // Check if target user already liked sender (reverse like exists)
        let reverse_like_seeds = [
            b"like",
            target_user.as_ref(),
            sender_key.as_ref(),
        ];
        let (reverse_like_pda, _) = Pubkey::find_program_address(&reverse_like_seeds, ctx.program_id);
        
        let mut is_mutual = false;
        if let Some(reverse_like_info) = ctx.remaining_accounts.get(0) {
            if reverse_like_info.key() == reverse_like_pda && !reverse_like_info.data_is_empty() {
                is_mutual = true;
                
                // Add to both users' matches
                if !sender_profile.matches.contains(&target_user) {
                    sender_profile.matches.push(target_user);
                }
                if !target_profile.matches.contains(&sender_key) {
                    target_profile.matches.push(sender_key);
                }
            }
        }

        like.is_mutual = is_mutual;
        Ok(())
    }

    // Fixed messaging function with better memory management
    pub fn send_message(ctx: Context<SendMessage>, _message_id: u64, content: String) -> Result<()> {
        // Validate content length early to prevent large allocations
        require!(content.len() <= 80, SolDateError::MessageTooLong); // Reduced even further
        require!(ctx.accounts.sender_profile.is_active, SolDateError::UserNotActive);
        require!(ctx.accounts.receiver_profile.is_active, SolDateError::UserNotActive);
        
        let sender = ctx.accounts.sender.key();
        let receiver = ctx.accounts.receiver_profile.owner;
        require!(sender != receiver, SolDateError::CannotMessageSelf);

        // Check permissions before any allocations
        let sender_like_seeds = [b"like", sender.as_ref(), receiver.as_ref()];
        let receiver_like_seeds = [b"like", receiver.as_ref(), sender.as_ref()];
        
        let (sender_like_pda, _) = Pubkey::find_program_address(&sender_like_seeds, ctx.program_id);
        let (receiver_like_pda, _) = Pubkey::find_program_address(&receiver_like_seeds, ctx.program_id);
        
        let mut can_message = false;
        
        // Check if either like exists in remaining accounts
        for account_info in ctx.remaining_accounts.iter() {
            if (account_info.key() == sender_like_pda || account_info.key() == receiver_like_pda) 
                && !account_info.data_is_empty() {
                can_message = true;
                break;
            }
        }
        
        require!(can_message, SolDateError::NoLikeExists);

        // Only allocate the message account after all validations pass
        let message_account = &mut ctx.accounts.message;
        let timestamp = Clock::get()?.unix_timestamp;

        message_account.sender = sender;
        message_account.receiver = receiver;
        message_account.content = content;
        message_account.timestamp = timestamp;
        message_account.bump = ctx.bumps.message;

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
    )]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(target_user: Pubkey)]
pub struct SendLike<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", sender.key().as_ref()],
        bump = sender_profile.bump
    )]
    pub sender_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [b"profile", target_user.key().as_ref()],
        bump = target_profile.bump
    )]
    pub target_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = sender,
        space = 8 + Like::INIT_SPACE,
        seeds = [b"like", sender.key().as_ref(), target_user.as_ref()],
        bump
    )]
    pub like: Account<'info, Like>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(message_id: u64)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(
        seeds = [b"profile", sender.key().as_ref()],
        bump = sender_profile.bump
    )]
    pub sender_profile: Account<'info, UserProfile>,
    
    #[account(
        seeds = [b"profile", receiver_profile.owner.as_ref()],
        bump = receiver_profile.bump
    )]
    pub receiver_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = sender,
        space = 8 + MessageAccount::INIT_SPACE,
        seeds = [
            b"message", 
            sender.key().as_ref(),
            receiver_profile.owner.as_ref(),
            message_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub message: Account<'info, MessageAccount>,
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
    pub is_mutual: bool,
    pub bump: u8
}

// Simple message account with String (reduced size)
#[account]
#[derive(InitSpace)]
pub struct MessageAccount {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    #[max_len(80)] // Reduced from 200 to 80 for better memory management
    pub content: String,
    pub timestamp: i64,
    pub bump: u8
}

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
    #[msg("Invalid User")]
    InvalidUser,
    #[msg("User not active")]
    UserNotActive,
    #[msg("Cannot like self")]
    CannotLikeSelf,
    #[msg("Cannot message self")]
    CannotMessageSelf,
    #[msg("Not mutual likes")]
    NotMutualLikes,
    #[msg("No like exists between users")]
    NoLikeExists,
}