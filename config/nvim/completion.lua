-- nvim-cmp - AUTOCOMPLETION ENGINE
local cmp = require'cmp'

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
    ['<CR>'] = cmp.mapping({
      i = cmp.mapping.confirm({ select = true }),
      c = cmp.mapping.confirm({ select = false }),
    }),
  },
  sources = cmp.config.sources({
    { name = 'nvim_lsp' },
    { name = 'vsnip' },
  }, {
    { name = 'buffer' },
  }),
  formatting = {
    format = require("lspkind").cmp_format({with_text = false, menu = ({
      buffer = "[Buf]",
      nvim_lsp = "[LSP]",
      vsnip = "[Snip]",
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

-- autopairs -- BRACKET COMPLETION
require('nvim-autopairs').setup{}
