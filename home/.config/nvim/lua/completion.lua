-- nvim-cmp - AUTOCOMPLETION ENGINE
local cmp = require'cmp'

local has_words_before = function()
  -- For Tab completion support of multiple lines
  -- https://github.com/zbirenbaum/copilot-cmp
  if vim.api.nvim_buf_get_option(0, "buftype") == "prompt" then return false end
  local line, col = unpack(vim.api.nvim_win_get_cursor(0))
  return col ~= 0 and vim.api.nvim_buf_get_text(0, line-1, 0, line-1, col, {})[1]:match("^%s*$") == nil
end

cmp.setup({
  snippet = {
    expand = function(args)
      -- Even though I don't really use snippets, without a snippet lib here,
      -- we hit bugs with 'confirm', where it could delete what we just entered.
      vim.fn["vsnip#anonymous"](args.body)
    end,
  },
  mapping = {
    ['<C-d>'] = cmp.mapping(cmp.mapping.scroll_docs(-4), { 'i', 'c' }),
    ['<C-f>'] = cmp.mapping(cmp.mapping.scroll_docs(4), { 'i', 'c' }),
    ['<Tab>'] = cmp.mapping(cmp.mapping.select_next_item(), { 'i', 's', 'c' }),
    ['<C-p>'] = cmp.mapping(cmp.mapping.select_prev_item(), { 'i', 's', 'c' }),
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<CR>'] = cmp.mapping({
      i = cmp.mapping.confirm({ select = true }),
      c = cmp.mapping.confirm({ select = false }),
    }),
    ["<Tab>"] = vim.schedule_wrap(function(fallback)
      -- For Copilot support
      if cmp.visible() and has_words_before() then
        cmp.select_next_item({ behavior = cmp.SelectBehavior.Select })
      else
        fallback()
      end
    end
    ),
  },
  sources = cmp.config.sources({
    { name = 'nvim_lsp' },
    { name = 'nvim_lsp_signature_help' },
    { name = 'vsnip' },
    { name = 'copilot' },
  }, {
    { name = 'buffer' },
  }),
  formatting = {
    format = require("lspkind").cmp_format({with_text = false, menu = ({
      buffer = "[B]",
      nvim_lsp = "[L]",
      vsnip = "[S]",
      copilot = "[C]",
      nvim_lua = "[Lua]",
      latex_symbols = "[Latex]",
    })}),
  },
})

-- Use buffer source for `/`.
cmp.setup.cmdline('/', {
  sources = {
    { name = 'buffer' }
  }
})

-- Use cmdline & path source for ':'.
cmp.setup.cmdline(':', {
  sources = cmp.config.sources({
    { name = 'path' }
  }, {
    { name = 'cmdline' }
  })
})
