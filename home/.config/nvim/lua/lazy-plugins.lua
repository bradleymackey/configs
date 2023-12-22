function load_vim_config(file)
    local path = vim.fn.stdpath('config') .. '/vim/'
    local sourced = 'source ' .. path
    vim.cmd(sourced .. file)
end

return {
    -- GUI
    {
        "nvim-neo-tree/neo-tree.nvim",
        branch = "v3.x",
        dependencies = {
            "nvim-lua/plenary.nvim",
            "nvim-tree/nvim-web-devicons", -- not strictly required, but recommended
            "MunifTanjim/nui.nvim",
        },
        config = function()
            require('neo-tree').setup {
                filesystem = {
                    filtered_items = {
                        visible = true,
                        hide_dotfiles = false,
                        hide_gitignored = false,
                    },
                },
                window = {
                    mapping_options = {
                        noremap = true,
                        nowait = true,
                    },
                    mappings = {
                        ["<space>"] = { 
                            "toggle_node", 
                            nowait = false, -- disable `nowait` if you have existing combos starting with this char that you want to use 
                        },
                        ["<2-LeftMouse>"] = "open",
                        ["<cr>"] = "open",
                    },
                }
            }
        end
    },
    {
        "chriskempson/base16-vim"
    },
    {
        "itchyny/lightline.vim",
        config = function()
            load_vim_config('lightline.vim')
        end,
    },

    -- EDITOR
    {
        'lewis6991/gitsigns.nvim',
        dependencies = {
            'nvim-lua/plenary.nvim',
        },
        config = function()
            require('gitsigns-config')
        end
    },
    { "junegunn/fzf", dir = "~/.fzf", build = "./install --all" },
    { "tomtom/tcomment_vim" },
    { 
        'nvim-treesitter/nvim-treesitter', 
        build = ":TSUpdate",
        event = { "BufReadPost", "BufNewFile" },
        main = 'nvim-treesitter.configs',
        cmd = {
            'TSUpdate',
            'TSInstall',
            'TSInstallInfo',
            'TSModuleInfo',
            'TSConfigInfo',
            'TSUpdateSync',
        },
        keys = {
            { 'v', desc = 'Increment selection', mode = 'x' },
            { 'V', desc = 'Shrink selection', mode = 'x' },
        },
        dependencies = {
            "hiphish/rainbow-delimiters.nvim",
            "JoosepAlviste/nvim-ts-context-commentstring",
            "nvim-treesitter/nvim-treesitter-textobjects",
            "RRethy/nvim-treesitter-textsubjects",
        },
        config = function()
            require("treesitter-config")
        end
    },
    {
        'nvim-treesitter/nvim-treesitter-context',
        dependencies = {
            'nvim-treesitter/nvim-treesitter',
        },
        config = function()
            require('treesitter-context-config')
        end
    },
    { "tpope/vim-sleuth" },
    {
        'windwp/nvim-autopairs',
        config = function()
            require('nvim-autopairs').setup{}
        end
    },

    -- LSP
    {
        "neovim/nvim-lspconfig"
    },
    {
        "nvim-lua/lsp-status.nvim"
    },

    -- COPILOT
    {
        "zbirenbaum/copilot.lua",
        enabled = true,
        cmd = "Copilot",
        event = "InsertEnter",
        opts = {
            suggestion = { enabled = false },
            panel = { enabled = false },
        },
    },

    -- COMPLETION
    {
        "hrsh7th/nvim-cmp",
        -- load cmp on InsertEnter
        event = "InsertEnter",
        -- these dependencies will only be loaded when cmp loads
        -- dependencies are always lazy-loaded unless specified otherwise
        dependencies = {
            "hrsh7th/cmp-nvim-lsp",
            "hrsh7th/cmp-buffer",
            "hrsh7th/cmp-path",
            "hrsh7th/cmp-cmdline",
            "hrsh7th/cmp-vsnip",
            "hrsh7th/vim-vsnip",
            "onsails/lspkind-nvim",
            "hrsh7th/cmp-nvim-lsp-signature-help",
            {
                "zbirenbaum/copilot-cmp",
                opts = {},
            },
        },
        config = function()
            require("completion")
        end,
    }
}
