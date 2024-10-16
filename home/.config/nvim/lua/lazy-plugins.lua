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
            -- "nvim-tree/nvim-web-devicons", -- see circles.nvim config below
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
        "RRethy/base16-nvim",
    },
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            require('lualine').setup {
                sections = {
                    lualine_c = {
                        {
                            'filename',
                            file_status = true,
                            path = 1,
                        }
                    },
                },
                extensions = {
                    "lazy", "neo-tree", "fzf"
                }
            }
        end
    },
    {
        "projekt0n/circles.nvim",
        dependencies = {
            "nvim-tree/nvim-web-devicons",
        },
        config = function()
            require("circles").setup()
        end
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
    {
        'junegunn/fzf.vim',
        dependencies = {
            { 'junegunn/fzf', build = './install --all' },
        },
        config = function()
            -- stop putting a giant window over my editor
            vim.g.fzf_layout = { down = '~20%' }
            -- when using :Files, pass the file list through
            --
            --   https://github.com/jonhoo/proximity-sort
            --
            -- to prefer files closer to the current file.
            function list_cmd()
                local base = vim.fn.fnamemodify(vim.fn.expand('%'), ':h:.:S')
                if base == '.' then
                    -- if there is no current file,
                    -- proximity-sort can't do its thing
                    return 'fd --type file --follow'
                else
                    return vim.fn.printf('fd --type file --follow | proximity-sort %s', vim.fn.shellescape(vim.fn.expand('%')))
                end
            end
            vim.api.nvim_create_user_command('Files', function(arg)
                vim.fn['fzf#vim#files'](arg.qargs, { source = list_cmd(), options = '--tiebreak=index' }, arg.bang)
                end, { bang = true, nargs = '?', complete = "dir" })
        end
    },
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
            { "nushell/tree-sitter-nu", build = ":TSUpdate nu" },
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
    {
        "nvimtools/none-ls.nvim",
        dependencies = {
            "nvim-lua/plenary.nvim",
        },
        config = function()
          -- null-ls is used for non-lsp stuff
          local null_ls = require("null-ls")
          local formatting = null_ls.builtins.formatting
          local diagnostics = null_ls.builtins.diagnostics
          local code_actions = null_ls.builtins.code_actions

          null_ls.setup({
            capabilities = capabilities,
            on_attach = function(client)
              -- Trigger formatting if the client supports it.
              if client.server_capabilities.documentFormattingProvider then
                vim.cmd("autocmd BufWritePre <buffer> lua vim.lsp.buf.format({ async = false })")
              end
            end,
            diagnostics_format = "#{m}",
            debounce = 250,
            default_timeout = 5000,
            sources = {
              formatting.prettier,
              formatting.black,
              -- diagnostics.write_good,
              diagnostics.eslint,
              diagnostics.flake8,
              code_actions.gitsigns,
            },
          })
        end,
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
