App = {
    init: async(enable = false) => {
        console.log("init:", enable)
        return await App.initWeb3(enable)
    },
    initWeb3: async(enable = false) => {
        try {
            if (enable) {
                const provider = await App.getProviderInstance()
                App.web3 = new Web3(provider)
            } else {
                App.web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed1.binance.org:443"))
            }
            return App.initContracts()
        } catch (error) {
            alert("Enable to access to Metamask")
            console.log(error)
        }
    },
    getProviderInstance: async() => {
        const {
            ethereum
        } = window
        if (ethereum) {
            try {
                await ethereum.enable()
                return ethereum
            } catch (error) {
                return null;
            }
        }
        const {
            web3
        } = window
        if (web3 && web3.currentProvider) {
            return web3.currentProvider
        }
        return null
    },
    initContracts: async() => {
        App.networkId = await App.web3.eth.net.getId()
        if (App.networkId !== 56) {
            alert("Please switch to Binance Smart Chain");
            return
        }
        App.tokenInstance = new App.web3.eth.Contract(tokenAbi, tokenAdderss)
        App.bnbInstance = new App.web3.eth.Contract(bnbFarmAbi, bnbFarmAddress)
        App.dogeInstance = new App.web3.eth.Contract(dogeFarmAbi, dogeFarmAddress)
        App.wbnbInstance = new App.web3.eth.Contract(tokenAbi, '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c')
        App.lpInstance = new App.web3.eth.Contract(tokenAbi, pupLpAdderss);
        App.userLoaded = true;
        App.initLoaded = true;
        return App.initVariables()
    },
    async login() {
        App.account = await App.web3.eth.getAccounts().then(accounts => accounts[0])
        console.log("App.account:", App.account)
        if (App.account) {
            farms.forEach(async farm => {
                if ($('#' + farm.id).length > 0) {
                    $('#' + farm.id + ' .unlock-btn').hide();
                    $('#' + farm.id + ' .deposit-btn').show();
                }
            });
            setTimeout(() => {
                App.userLoaded = true;
                App.loadUserData()
                if (App.binded) {
                    return;
                }
                App.binded = true;
                App.bindClick();
            }, 500)
        }
    },
    initVariables: async() => {
        await App.login();
        farms.forEach(async farm => {
            if ($('#' + farm.id).length > 0) {
                $('#' + farm.id + " .apr-icon").on("click", function() {
                    console.log("farm.apr:", farm.id, farm.apr);
                    let oneDay = farm.apr / 365;
                    let oneDayMoney = 1000 * oneDay / 100;
                    let apr2 = (Math.pow(1 + oneDay / 100, 7) - 1) * 100;
                    let money2 = 1000 * apr2 / 100;
                    let maxApr = 10000000;
                    let apr3 = (Math.pow(1 + oneDay / 100, 30) - 1) * 100;
                    apr3 = Math.min(apr3, maxApr);
                    let money3 = 1000 * apr3 / 100;
                    money3 = Math.min(money3, maxApr);
                    let apr4 = (Math.pow(1 + apr3 / 100, 12) - 1) * 100;
                    apr4 = Math.min(apr4, maxApr);
                    let money4 = 1000 * apr4 / 100;
                    money4 = Math.min(money4, maxApr);
                    $('.apr-1').html(oneDay.toFixed(2) + '%')
                    $('.money-1').html('$' + oneDayMoney.toFixed(2))
                    $('.apr-2').html(apr2.toFixed(2) + '%')
                    $('.money-2').html('$' + money2.toFixed(2))
                    $('.apr-3').html(apr3.toFixed(2) + (apr3 >= maxApr ? '+%' : '%'))
                    $('.money-3').html('$' + money3.toFixed(2) + (money3 >= maxApr ? '+' : ''))
                    $('.apr-4').html(apr4.toFixed(2) + (apr4 >= maxApr ? '+%' : '%'))
                    $('.money-4').html('$' + money4.toFixed(2) + (money4 >= maxApr ? '+' : ''))
                    $(".tanchuang2").show();
                })
            }
        });
        await App.getDogeAndLpPrice();
        return App.render()
    },
    getDogeAndLpPrice: async() => {
        let balance = await App.wbnbInstance.methods.balanceOf(pupLpAdderss).call();
        let lpBnb = App.fromWei(balance, 18);
        balance = await App.tokenInstance.methods.balanceOf(pupLpAdderss).call();
        let lpToken = App.fromWei(balance, 9);
        if (lpToken.gt(new BigNumber(0))) {
            App.dogePrice = lpBnb.div(lpToken).toNumber();
            let supply = await App.lpInstance.methods.totalSupply().call();
            supply = App.fromWei(supply, 18);
            App.lpPrice = lpToken.div(supply).toNumber() * 2 * App.dogePrice;
        } else {
            App.dogePrice = 0;
            App.lpPrice = 0;
        }
    },
    initBscData: async() => {
        if (!App.initLoaded) {
            return;
        }
        App.initLoaded = false;
        let bnbPerBlock = await App.bnbInstance.methods.sushiPerBlock().call();
        bnbPerBlock = App.fromWei(bnbPerBlock, 18).toNumber();
        let dogePerBlock = await App.dogeInstance.methods.sushiPerBlock().call();
        dogePerBlock = App.fromWei(dogePerBlock, 9).toNumber();
        let bnbTotalAllocPoint = await App.bnbInstance.methods.totalAllocPoint().call();
        bnbTotalAllocPoint = bnbTotalAllocPoint * 1;
        let dogeTotalAllocPoint = await App.dogeInstance.methods.totalAllocPoint().call();
        dogeTotalAllocPoint = dogeTotalAllocPoint * 1;
        farms.forEach(async farm => {
            if ($('#' + farm.id).length > 0) {
                let aprDom = $('#' + farm.id + ' .farm-apr');
                $('#' + farm.id + ' .farm-rate').html(farm.rate);
                let instance = farm.earn === 'BNB' ? App.bnbInstance : App.dogeInstance;
                let poolInfo = await instance.methods.poolInfo(farm.pid).call().catch(e => {
                    console.log('e:', e);
                    aprDom.html(farm.apr.toFixed(2) + '%');
                })
                let totalDeposit = App.fromWei(poolInfo.totalDeposit, farm.deposit === 'PDOGE' ? 9 : 18).toNumber();
                let apr = 0;
                if (farm.earn === 'BNB') {
                    let perBlock = poolInfo.allocPoint * bnbPerBlock / bnbTotalAllocPoint
                    let oneYear = perBlock * 20 * 60 * 24 * 365;
                    if (totalDeposit > 0) {
                        if (farm.deposit === 'PDOGE') {
                            apr = (oneYear / App.dogePrice / totalDeposit * 100).toFixed(2);
                        } else {
                            apr = (oneYear / App.lpPrice / totalDeposit * 100).toFixed(2);
                        }
                    } else {
                        aprDom.html(farm.apr.toFixed(2) + '%');
                    }
                } else {
                    let perBlock = poolInfo.allocPoint * dogePerBlock / dogeTotalAllocPoint
                    let oneYear = perBlock * 20 * 60 * 24 * 365;
                    if (totalDeposit > 0) {
                        if (farm.deposit === 'PDOGE') {
                            apr = (oneYear / totalDeposit * 100).toFixed(2);
                        } else {
                            apr = (oneYear * App.dogePrice / totalDeposit / App.lpPrice * 100).toFixed(2);
                        }
                    } else {
                        aprDom.html(farm.apr.toFixed(2) + '%');
                    }
                }
                farm.frozen = poolInfo.frozenTime * 1;
                let lockTime = parseInt(farm.frozen / (3600 * 24)) + ' Days(s)';
                $('#' + farm.id + ' .farm-time').html(lockTime);
                apr = apr * 10;
                farm.apr = apr;
                aprDom.html(apr.toFixed(2) + '%');
                $('#' + farm.id + ' .farm-total').html(to_fixed(totalDeposit));
            }
        })
        App.initLoaded = true;
    },
    loadUserData: async() => {
        if (!App.account || !App.userLoaded) {
            return;
        }
        App.userLoaded = false;
        let balance = await App.tokenInstance.methods.balanceOf(App.account).call()
        App.tokenBalance = App.fromWei(balance, 9);
        balance = await App.lpInstance.methods.balanceOf(App.account).call()
        App.lpBalance = App.fromWei(balance, 18);
        farms.forEach(async farm => {
            if ($('#' + farm.id).length > 0) {
                let depositDom = $('#' + farm.id + ' .deposit-btn');
                if (farm.deposit === 'PDOGE') {
                    $('#' + farm.id + ' .farm-balance').html(to_fixed(App.tokenBalance));
                } else {
                    $('#' + farm.id + ' .farm-balance').html(App.lpBalance.toFixed(4));
                }
                let instance = farm.deposit === 'PDOGE' ? App.tokenInstance : App.lpInstance;
                let allowance = App.fromWei(await instance.methods.allowance(App.account, farm.farmAddress).call(), farm.deposit === 'PDOGE' ? 9 : 18).toNumber();
                if (depositDom.html() === 'Pending...') {} else if (allowance > 100) {
                    depositDom.html('Deposit').removeClass('pancake-button--disabled').attr('disabled', false);
                } else {
                    depositDom.html('Approve').removeClass('pancake-button--disabled').attr('disabled', false);
                }
                instance = farm.earn === 'BNB' ? App.bnbInstance : App.dogeInstance;
                let pending = App.fromWei(await instance.methods.pendingSushi(farm.pid, App.account).call(), farm.earn === 'PDOGE' ? 9 : 18);
                farm.pending = pending;
                if (farm.earn === 'BNB') {
                    $('#' + farm.id + ' .farm-pending').html(pending.toFixed(8));
                } else {
                    $('#' + farm.id + ' .farm-pending').html(to_fixed(pending));
                }
                let claimDom = $('#' + farm.id + ' .claim-btn');
                if (pending.toNumber() > 0 && claimDom.html() !== 'Pending...') {
                    claimDom.removeClass('pancake-button--disabled').attr('disabled', false);
                } else {
                    claimDom.addClass('pancake-button--disabled').attr('disabled', true);
                }
                let userInfo = await instance.methods.userInfo(farm.pid, App.account).call();
                let amount = App.fromWei(userInfo.amount, farm.deposit === 'PDOGE' ? 9 : 18);
                farm.amount = amount;
                $('#' + farm.id + ' .farm-amount').html(to_fixed(amount));
                let lastDeposit = userInfo.lastDeposit * 1;
                let interval = farm.frozen - ((new Date().getTime()) / 1000 - lastDeposit);
                let removeDom = $('#' + farm.id + ' .withdraw-btn');
                if (removeDom.html() === 'Pending...') {} else if (interval < 1 && amount > 0 && lastDeposit > 0) {
                    removeDom.removeClass('pancake-button--disabled').html('WithDraw').attr('disabled', false).show();
                } else if (amount > 0) {
                    removeDom.addClass('pancake-button--disabled').html('WithDraw').attr('disabled', true).show();
                    App.countDown(farm, $('#' + farm.id + ' .unlock-time'), interval)
                } else if (amount <= 0) {
                    removeDom.addClass('pancake-button--disabled').html('WithDraw').attr('disabled', true).show();
                }
            }
        });
        App.userLoaded = true;
    },
    countDown: (farm, dom, interval) => {
        if (!farm['interval'] || Math.abs(farm['interval'] - interval) > 10) {
            farm['interval'] = interval;
        } else {
            return;
        }
        farm.timer && clearInterval(farm.timer);
        farm.timer = setInterval(() => {
            let d = '00';
            let h = '00';
            let m = '00';
            let s = '00';
            if (farm['interval'] > 0) {
                d = parseInt(farm['interval'] / (60 * 60) / 24)
                h = App.format(parseInt(farm['interval'] / (60 * 60) % 24))
                m = App.format(parseInt((farm['interval'] / 60) % 60))
                s = App.format(parseInt(farm['interval'] % 60))
            }
            dom.html('  ' + d + ' day ' + h + ':' + m + ':' + s).attr('disabled', true).show();
            if (farm['interval']-- <= 0) {
                clearInterval(farm.timer)
            }
        }, 1000)
    },
    format(time) {
        if (time >= 10) {
            return time
        } else {
            return `0${time}`
        }
    },
    bindClick: () => {
        if (!App.account) {
            return;
        }
        farms.forEach(farm => {
            if ($('#' + farm.id).length > 0) {
                $('#' + farm.id + ' .deposit-btn').on("click", async() => {
                    if ($('#' + farm.id + ' .deposit-btn').html() === 'Approve') {
                        App.approveTokens(farm, farm.farmAddress);
                    } else {
                        if (farm.deposit === 'PDOGE') {
                            $('#a-link').attr('href', 'https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x1c91b818e244c20732f917fde4c872644bcc544d');
                            $('#a-link span').html("Get PDoge Token")
                        } else {
                            $('#a-link').attr('href', 'https://exchange.pancakeswap.finance/#/add/BNB/0x1c91b818e244c20732f917fde4c872644bcc544d');
                            $('#a-link span').html("Add PDoge-BNB-LP")
                        }
                        $('.deposit-input').val('');
                        App.activeFarm = farm;
                        $(".gmORUi").show();
                        $(".pop-token").html(farm.deposit);
                        let instance = farm.deposit === 'PDOGE' ? App.tokenInstance : App.lpInstance;
                        let balance = await instance.methods.balanceOf(App.account).call()
                        balance = App.fromWei(balance, farm.deposit === 'PDOGE' ? 9 : 18);
                        App.balance = balance;
                        $(".my-balance").html(to_fixed(balance));
                    }
                });
                $('#' + farm.id + ' .withdraw-btn').on("click", async() => {
                    App.remove(farm);
                });
                $('#' + farm.id + ' .claim-btn').on("click", async() => {
                    App.claim(farm);
                });
            }
        });
        $('.max-btn').on("click", async() => {
            $('.deposit-input').val(App.balance);
        });
        console.log("bindClick")
        $('.confirm-btn').on("click", async() => {
            let amount = $('.deposit-input').val();
            if (!amount) {
                console.log("amount error")
                return;
            }
            App.depositToken(App.activeFarm, amount)
        });
    },
    remove(farm) {
        let instance = farm.earn === 'BNB' ? App.bnbInstance : App.dogeInstance;
        instance.methods.withdraw(farm.pid, App.toWei(farm.amount, farm.deposit === 'PDOGE' ? 9 : 18).toFixed()).send({
            from: this.account,
        }).on("transactionHash", hash => {
            $('#' + farm.id + ' .withdraw-btn').html('Pending...').addClass('pancake-button--disabled').attr('disabled', true);
            console.log('hash:', hash);
        }).on("receipt", receipt => {
            $('#' + farm.id + ' .withdraw-btn').html('WithDraw')
            console.log('receipt:', receipt);
            setTimeout(() => {
                App.loadUserData();
                App.initBscData();
            }, 500)
        }).on("error", error => {
            $('#' + farm.id + ' .withdraw-btn').html('WithDraw');
            console.log('error:', error);
        })
    },
    claim(farm) {
        let instance = farm.earn === 'BNB' ? App.bnbInstance : App.dogeInstance;
        instance.methods.deposit(farm.pid, 0).send({
            from: this.account,
        }).on("transactionHash", hash => {
            $('#' + farm.id + ' .claim-btn').html('Pending...').addClass('pancake-button--disabled').attr('disabled', true);
            console.log('hash:', hash);
        }).on("receipt", receipt => {
            $('#' + farm.id + ' .claim-btn').html('Claim').removeClass('pancake-button--disabled').attr('disabled', false);;
            console.log('receipt:', receipt);
            setTimeout(() => {
                App.loadUserData();
                App.initBscData();
            }, 500)
        }).on("error", error => {
            $('#' + farm.id + ' .claim-btn').html('Claim').removeClass('pancake-button--disabled').attr('disabled', false);;
            console.log('error:', error);
        })
    },
    depositToken: async(farm, amount) => {
        let instance = farm.earn === 'BNB' ? App.bnbInstance : App.dogeInstance;
        amount = App.toWei(amount, farm.deposit === 'PDOGE' ? 9 : 18).toFixed();
        console.log("amount:", amount, 'pid:', farm.pid);
        instance.methods.deposit(farm.pid, amount).send({
            from: App.account,
        }).on("transactionHash", hash => {
            $(".gmORUi").hide();
            $('#' + farm.id + ' .deposit-btn').html('Pending...').addClass('pancake-button--disabled').attr('disabled', true);
            console.log('hash:', hash);
        }).on("receipt", receipt => {
            $('#' + farm.id + ' .deposit-btn').html('Deposit').removeClass('pancake-button--disabled').attr('disabled', false);
            console.log('receipt:', receipt);
            setTimeout(() => {
                App.loadUserData();
                App.initBscData();
            }, 500)
        }).on("error", error => {
            $('#' + farm.id + ' .deposit-btn').html('Deposit').removeClass('pancake-button--disabled').attr('disabled', false);
            console.log('error:', error);
        })
    },
    approveTokens: async(farm, farmAddress) => {
        try {
            let deposit = farm.deposit;
            let instance = deposit === 'PDOGE' ? App.tokenInstance : App.lpInstance;
            const maxUint = '11579208923731619542357098500868790785326998466564056403945758400791312963993'
            return await instance.methods.approve(farmAddress, maxUint).send({
                from: App.account
            }).on("transactionHash", hash => {
                $('#' + farm.id + ' .deposit-btn').html('Pending...').addClass('pancake-button--disabled').attr('disabled', true);
            }).on("receipt", receipt => {
                $('#' + farm.id + ' .deposit-btn').html('Deposit').removeClass('pancake-button--disabled').attr('disabled', false);
            }).on("error", error => {
                $('#' + farm.id + ' .deposit-btn').html('Approve').removeClass('pancake-button--disabled').attr('disabled', false);
            })
        } catch (error) {
            throw 'User denied transaction!'
        }
    },
    render: async() => {
        await App.initBscData()
        App.loadUserData()
        setInterval(() => {
            App.loadUserData();
        }, 8000)
        setInterval(() => {
            App.initBscData();
        }, 20000)
    },
    toWei: (amount, decimals) => {
        return (new BigNumber(amount.toString()).multipliedBy(new BigNumber('10').pow(new BigNumber(decimals.toString()))))
    },
    fromWei: (amount, decimals) => {
        return (new BigNumber(amount.toString()).div(new BigNumber('10').pow(new BigNumber(decimals.toString()))))
    },
}
$(window).on("load", () => {
    $(function() {
        farms.forEach(async farm => {
            if ($('#' + farm.id).length > 0) {
                $('#' + farm.id + ' .unlock-btn').on("click", async() => {
                    App.init(true);
                })
            }
        });
        App.init(false)
    })
})

function to_fixed(value) {
    function fixed(num, len = 2) {
        if (num == 0) {
            return '0.0000';
        }
        if (!Number(num)) {
            return '--'
        }
        num = num * 1;
        return num.toFixed(len).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
    }
    value = value * 1;
    if (value > 1e9) {
        return fixed((value / 1e9)) + ' B'
    }
    if (value > 1e6) {
        return fixed((value / 1e6)) + ' M'
    }
    if (value > 1e3) {
        return fixed((value / 1e3)) + ' K'
    }
    return fixed(value)
}
