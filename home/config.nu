# Nushell Config File

$env.config = {
    show_banner: false
    rm: {
        always_trash: true
    }
}

def prompt-git-branch [] {
    git rev-parse --abbrev-ref HEAD | str trim -r
}

def create_left_prompt [] {
    let cwd = $env.PWD | str replace $env.HOME '~';
    let current_dir_name = ($cwd | split row "/" | last);
    # Call the git branch function
    let git_branch = try { prompt-git-branch } catch { '' };
    
    # If there is a Git branch, concatenate it
    let branch_display = if $git_branch != '' { $" (ansi blue)git:(ansi red_bold)($git_branch)" } else { '' };

    # Build the final prompt
    let prompt = $"($current_dir_name)($branch_display) "

    $prompt
}

def create_right_prompt [] {
    ""
}

def or-error-style [] {
    if ($env.LAST_EXIT_CODE == 0) { $in } else { ansi red_bold }
}

$env.PROMPT_COMMAND = { create_left_prompt }
$env.PROMPT_COMMAND_RIGHT = { create_right_prompt }
$env.PROMPT_INDICATOR = { || $" (ansi green_bold | or-error-style)〉" }
