
'use strict';

const Basic = require('./basic');

class GameObject {


    create(args) {
        if (!this.check_form(args, 'create'))
            return;
    }

    get_form_for(player, name) {
        switch (name) {
            case 'create':
                return {
                    
                };
            default:
                return null;
        }
    }
}



class WearableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('wear');
        return verbs;
    }

    wear(args) {

    }
}

class WeildableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('weild');
        return verbs;
    }

    weild(args) {

    }
}

class EdibleItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('eat');
        return verbs;
    }

    eat(args) {

    }
}

class DrinkableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('drink');
        return verbs;
    }

    drink(args) {

    }
}


module.exports = {
    GameObject,
    WearableItem,
    WeildableItem,
    EdibleItem,
    DrinkableItem,
};

